import { randomInt } from 'crypto';
import { prismaClient } from '../../../config/prismaClient';
import { GymError } from '../GymError';
import { addToYmd, todayYmd, ymdToDbDate } from '../gymDates';
import {
    IMPORT_FIELDS,
    autoMapping,
    ImportFileError,
    MAX_IMPORT_ROWS,
    detectHeader,
    nameKey,
    normalizeCpf,
    normalizeEmail,
    normalizePhone,
    onlyDigits,
    monthsFromPlanName,
    parseDateBR,
    parseMoney,
    parseStatus,
    prettifyName,
    readImportFile,
    type ImportField,
    type ImportMapping,
    type ParsedTable,
} from './memberImportParser';

export type DuplicateMode = 'skip' | 'update';

export interface ImportRequest {
    file: string;
    fileName?: string;
    headerRow?: number;
    mapping?: ImportMapping;
    duplicates?: DuplicateMode;
    createPlans?: boolean;
    importInactive?: boolean;
}

type RowAction = 'create' | 'update' | 'skip' | 'error';

export interface AnalyzedRow {
    line: number;
    action: RowAction;
    errors: string[];
    warnings: string[];
    existingMemberId?: string;
    data: {
        name: string;
        cpf: string | null;
        phone: string | null;
        email: string | null;
        birthDate: string | null;
        accessCode: string | null;
        status: 'ACTIVE' | 'INACTIVE';
        planName: string | null;
        planPrice: number | null;
        planStart: string | null;
        /** "Aluno desde" no sistema antigo (vira a data de cadastro, para não contar como novo no mês da importação) */
        memberSince: string | null;
        planEnd: string | null;
        notes: string | null;
    };
}

const MAX_NOTES = 1000;

function cell(row: string[], mapping: ImportMapping, f: ImportField): string {
    const i = mapping[f];
    return i === undefined || i === null || i < 0 ? '' : (row[i] ?? '').trim();
}

/** Valida um índice de coluna vindo do front. */
function sanitizeMapping(mapping: ImportMapping, width: number): ImportMapping {
    const out: ImportMapping = {};
    for (const f of IMPORT_FIELDS) {
        const v = mapping[f.key];
        if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < width) out[f.key] = v;
    }
    return out;
}

class GymMemberImportService {
    private load(req: ImportRequest) {
        let table: ParsedTable;
        try {
            table = readImportFile(req.file, req.fileName);
        } catch (e) {
            if (e instanceof ImportFileError) throw new GymError(e.message, 400, 'IMPORT_FILE_INVALID');
            throw e;
        }
        const detected = detectHeader(table.rows);
        const headerRow =
            typeof req.headerRow === 'number' && req.headerRow >= 0 && req.headerRow < table.rows.length
                ? req.headerRow
                : detected.headerRow;
        const header = table.rows[headerRow] ?? [];
        const width = Math.max(header.length, ...table.rows.slice(headerRow, headerRow + 50).map((r) => r.length));
        const mapping = req.mapping ? sanitizeMapping(req.mapping, width) : autoMapping(header);
        const body = table.rows
            .map((r, i) => ({ row: r, line: i + 1 }))
            .slice(headerRow + 1)
            .filter(({ row }) => row.some((v) => v.trim()));
        if (body.length > MAX_IMPORT_ROWS) {
            throw new GymError(`O arquivo tem ${body.length} linhas; o limite por importação é ${MAX_IMPORT_ROWS}.`, 400, 'IMPORT_TOO_MANY_ROWS');
        }
        const columns = Array.from({ length: width }, (_, i) => ({
            index: i,
            header: header[i] ?? '',
            samples: body
                .slice(0, 3)
                .map(({ row }) => row[i] ?? '')
                .filter(Boolean),
        }));
        return { table, headerRow, mapping, body, columns };
    }

    private normalizeRow(row: string[], line: number, mapping: ImportMapping): AnalyzedRow {
        const errors: string[] = [];
        const warnings: string[] = [];
        const extraNotes: string[] = [];

        const rawName = cell(row, mapping, 'name');
        const name = prettifyName(rawName);
        if (name.length < 2) errors.push('Nome em branco');
        if (name.length > 120) errors.push('Nome com mais de 120 caracteres');

        const cpfRaw = cell(row, mapping, 'cpf');
        const cpf = normalizeCpf(cpfRaw);
        if (cpf.invalid) {
            warnings.push(`CPF inválido (${cpfRaw}) — importado sem CPF`);
            extraNotes.push(`CPF no sistema antigo: ${cpfRaw}`);
        }

        const phoneRaw = cell(row, mapping, 'phone');
        const phone = normalizePhone(phoneRaw);
        if (phone.invalid) {
            warnings.push(`Telefone inválido (${phoneRaw}) — guardado nas observações`);
            extraNotes.push(`Telefone: ${phoneRaw}`);
        }

        const phone2Raw = cell(row, mapping, 'phone2');
        if (phone2Raw && onlyDigits(phone2Raw) !== phone.value) {
            if (!phone.value && !phone.invalid) {
                const p2 = normalizePhone(phone2Raw);
                if (p2.value) phone.value = p2.value;
                else extraNotes.push(`Telefone: ${phone2Raw}`);
            } else extraNotes.push(`Outro telefone: ${phone2Raw}`);
        }

        const emailRaw = cell(row, mapping, 'email');
        const email = normalizeEmail(emailRaw);
        if (email.invalid) warnings.push(`Email inválido (${emailRaw}) — ignorado`);

        const birthRaw = cell(row, mapping, 'birthDate');
        const birth = parseDateBR(birthRaw);
        if (birth.invalid) warnings.push(`Data de nascimento inválida (${birthRaw}) — ignorada`);
        if (birth.value && birth.value > todayYmd()) {
            warnings.push(`Data de nascimento no futuro (${birthRaw}) — ignorada`);
            birth.value = null;
        }

        const codeRaw = cell(row, mapping, 'accessCode');
        let accessCode: string | null = null;
        if (codeRaw) {
            const d = onlyDigits(codeRaw);
            if (d.length >= 4 && d.length <= 8 && d === codeRaw.replace(/\s/g, '')) accessCode = d;
            else warnings.push(`Senha da catraca "${codeRaw}" fora do padrão (4 a 8 números) — será gerada outra`);
        }

        const statusRaw = cell(row, mapping, 'status');
        const status = parseStatus(statusRaw);
        if (status.invalid) warnings.push(`Situação "${statusRaw}" não reconhecida — importado como ativo`);

        const planName = cell(row, mapping, 'planName').replace(/\s+/g, ' ') || null;
        const priceRaw = cell(row, mapping, 'planPrice');
        const price = parseMoney(priceRaw);
        if (price.invalid) warnings.push(`Valor "${priceRaw}" inválido — ignorado`);
        const startRaw = cell(row, mapping, 'planStart');
        const start = parseDateBR(startRaw);
        if (start.invalid) warnings.push(`Início do plano inválido (${startRaw}) — ignorado`);
        const sinceRaw = cell(row, mapping, 'memberSince');
        const since = parseDateBR(sinceRaw);
        if (since.invalid) warnings.push(`Data de inscrição inválida (${sinceRaw}) — ignorada`);
        const endRaw = cell(row, mapping, 'planEnd');
        const end = parseDateBR(endRaw);
        if (end.invalid) warnings.push(`Vencimento inválido (${endRaw}) — matrícula não criada`);
        if (planName && !end.value && !end.invalid) warnings.push('Plano sem vencimento — só o nome do plano é guardado nas observações');
        if (!planName && end.value) warnings.push('Vencimento sem plano — matrícula criada como "Plano importado"');

        // Campos sem lugar próprio vão para as observações
        const ext = cell(row, mapping, 'externalCode');
        if (ext) extraNotes.push(`Código no sistema antigo: ${ext}`);
        const rg = cell(row, mapping, 'rg');
        if (rg) extraNotes.push(`RG: ${rg}`);
        const gender = cell(row, mapping, 'gender');
        if (gender) extraNotes.push(`Sexo: ${gender}`);
        const addr = [cell(row, mapping, 'address'), cell(row, mapping, 'district'), [cell(row, mapping, 'city'), cell(row, mapping, 'state')].filter(Boolean).join('/'), cell(row, mapping, 'zip') ? `CEP ${cell(row, mapping, 'zip')}` : '']
            .filter(Boolean)
            .join(' - ');
        if (addr) extraNotes.push(`Endereço: ${addr}`);
        if (since.value) extraNotes.push(`Aluno desde: ${since.value.split('-').reverse().join('/')}`);
        if (planName && !end.value) extraNotes.push(`Plano no sistema antigo: ${planName}${price.value !== null ? ` (R$ ${price.value.toFixed(2).replace('.', ',')})` : ''}`);
        const obs = cell(row, mapping, 'notes');
        if (obs) extraNotes.push(obs);
        let notes = extraNotes.join('\n') || null;
        if (notes && notes.length > MAX_NOTES) notes = notes.slice(0, MAX_NOTES);

        return {
            line,
            action: errors.length ? 'error' : 'create',
            errors,
            warnings,
            data: {
                name,
                cpf: cpf.value,
                phone: phone.value,
                email: email.value,
                birthDate: birth.value,
                accessCode,
                status: status.value ?? 'ACTIVE',
                planName,
                planPrice: price.value,
                planStart: start.value,
                memberSince: since.value && since.value <= todayYmd() ? since.value : null,
                planEnd: end.value,
                notes,
            },
        };
    }

    /** Prévia para a tela: o que vai acontecer com cada linha (sem gravar nada). */
    async preview(organizationId: string, req: ImportRequest) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { usedCodes, ...rest } = await this.analyze(organizationId, req);
        return rest;
    }

    /** Lê, normaliza e marca o que vai acontecer com cada linha (sem gravar nada). */
    private async analyze(organizationId: string, req: ImportRequest) {
        const { table, headerRow, mapping, body, columns } = this.load(req);
        const duplicates: DuplicateMode = req.duplicates === 'update' ? 'update' : 'skip';
        const importInactive = req.importInactive !== false;

        const existing = await prismaClient.member.findMany({
            where: { organizationId },
            select: { id: true, name: true, cpf: true, birthDate: true, accessCode: true },
        });
        const byCpf = new Map(existing.filter((m) => m.cpf).map((m) => [m.cpf!, m]));
        const byName = new Map<string, typeof existing>();
        for (const m of existing) {
            const k = nameKey(m.name);
            byName.set(k, [...(byName.get(k) ?? []), m]);
        }
        const usedCodes = new Set(existing.map((m) => m.accessCode).filter(Boolean) as string[]);

        const seenCpf = new Map<string, number>();
        const seenName = new Map<string, number>();
        const seenCode = new Map<string, number>();
        const rows: AnalyzedRow[] = [];

        const hasName = mapping.name !== undefined;
        for (const { row, line } of body) {
            const r = this.normalizeRow(row, line, mapping);
            if (!hasName) r.errors.push('Coluna de nome não mapeada');
            if (!importInactive && r.data.status === 'INACTIVE' && !r.errors.length) {
                r.action = 'skip';
                r.warnings.push('Aluno inativo no sistema antigo — pulado');
            }

            // Duplicados dentro do próprio arquivo
            if (!r.errors.length && r.action !== 'skip') {
                const key = nameKey(r.data.name);
                if (r.data.cpf && seenCpf.has(r.data.cpf)) {
                    r.errors.push(`CPF repetido no arquivo (mesmo da linha ${seenCpf.get(r.data.cpf)})`);
                } else if (!r.data.cpf && seenName.has(key)) {
                    r.errors.push(`Nome repetido no arquivo sem CPF (mesmo da linha ${seenName.get(key)})`);
                }
                if (!r.errors.length) {
                    if (r.data.cpf) seenCpf.set(r.data.cpf, line);
                    if (!seenName.has(key)) seenName.set(key, line);
                }
            }

            // Já cadastrado na academia: por CPF; sem CPF, pelo nome (e nascimento quando houver)
            if (!r.errors.length && r.action !== 'skip') {
                let match = r.data.cpf ? byCpf.get(r.data.cpf) : undefined;
                if (!match) {
                    const sameName = byName.get(nameKey(r.data.name)) ?? [];
                    const birth = r.data.birthDate;
                    match = sameName.find(
                        (m) =>
                            (!r.data.cpf || !m.cpf) &&
                            (!birth || !m.birthDate || m.birthDate.toISOString().slice(0, 10) === birth)
                    );
                }
                if (match) {
                    r.existingMemberId = match.id;
                    r.action = duplicates === 'update' ? 'update' : 'skip';
                    r.warnings.push(duplicates === 'update' ? 'Já cadastrado — dados serão atualizados' : 'Já cadastrado — linha pulada');
                }
            }

            // Senha da catraca repetida (no arquivo ou com outro aluno)
            if (!r.errors.length && r.action !== 'skip' && r.data.accessCode) {
                const code = r.data.accessCode;
                const ownCode = r.existingMemberId && existing.find((m) => m.id === r.existingMemberId)?.accessCode === code;
                if (!ownCode && (usedCodes.has(code) || seenCode.has(code))) {
                    r.warnings.push(`Senha da catraca ${code} já usada por outro aluno — será gerada outra`);
                    r.data.accessCode = null;
                } else seenCode.set(code, line);
            }

            if (r.errors.length) r.action = 'error';
            rows.push(r);
        }

        const summary = {
            total: rows.length,
            create: rows.filter((r) => r.action === 'create').length,
            update: rows.filter((r) => r.action === 'update').length,
            skip: rows.filter((r) => r.action === 'skip').length,
            error: rows.filter((r) => r.action === 'error').length,
            withWarnings: rows.filter((r) => r.warnings.length).length,
            withPlan: rows.filter((r) => r.action !== 'error' && r.action !== 'skip' && r.data.planEnd).length,
        };

        return {
            file: {
                format: table.format,
                encoding: table.encoding ?? null,
                delimiter: table.delimiter ?? null,
                sheetName: table.sheetName ?? null,
                totalLines: table.rows.length,
            },
            headerRow,
            columns,
            mapping,
            fields: IMPORT_FIELDS.map(({ key, label, required }) => ({ key, label, required: !!required })),
            options: { duplicates, createPlans: req.createPlans !== false, importInactive },
            summary,
            rows,
            usedCodes,
        };
    }

    /** Grava o que a análise aprovou. Linhas com erro nunca são gravadas. */
    async commit(organizationId: string, req: ImportRequest, userId?: string) {
        const analysis = await this.analyze(organizationId, req);
        if (analysis.mapping.name === undefined) {
            throw new GymError('Escolha a coluna do nome do aluno antes de importar.', 400, 'IMPORT_NAME_REQUIRED');
        }
        const createPlans = req.createPlans !== false;
        const usedCodes = analysis.usedCodes;
        const nowDate = new Date();
        const today = todayYmd();

        const genCode = () => {
            for (let i = 0; i < 1000; i++) {
                const c = String(randomInt(100000, 1000000));
                if (!usedCodes.has(c)) {
                    usedCodes.add(c);
                    return c;
                }
            }
            throw new GymError('Não foi possível gerar senhas da catraca.', 500);
        };

        // Planos: reaproveita pelo nome (sem diferenciar maiúsculas); cria os que faltarem
        const plans = await prismaClient.membershipPlan.findMany({ where: { organizationId } });
        const planByKey = new Map(plans.map((p) => [nameKey(p.name), p]));
        const toApply = analysis.rows.filter((r) => r.action === 'create' || r.action === 'update');
        const createdPlans: string[] = [];
        if (createPlans) {
            for (const r of toApply) {
                const pn = r.data.planName;
                if (!pn || !r.data.planEnd) continue;
                const k = nameKey(pn);
                if (planByKey.has(k)) continue;
                const plan = await prismaClient.membershipPlan.create({
                    data: { organizationId, name: pn.slice(0, 80), price: r.data.planPrice ?? 0, durationMonths: monthsFromPlanName(pn), durationDays: 0 },
                });
                planByKey.set(k, plan);
                createdPlans.push(plan.name);
            }
        }

        const results: { line: number; action: RowAction | 'failed'; memberId?: string; name: string; message?: string }[] = [];
        let created = 0;
        let updated = 0;
        let memberships = 0;

        const membershipData = (r: AnalyzedRow, memberId: string) => {
            if (!r.data.planEnd) return null;
            const plan = r.data.planName ? planByKey.get(nameKey(r.data.planName)) : undefined;
            // Sem início informado: volta a duração do plano a partir do vencimento (mensal = 1 mês)
            const months = plan ? plan.durationMonths : monthsFromPlanName(r.data.planName);
            const days = plan ? plan.durationDays : 0;
            const fromDuration = addToYmd(addToYmd(r.data.planEnd, -months, -days), 0, 1);
            const start =
                r.data.planStart && r.data.planStart <= r.data.planEnd && r.data.planStart >= addToYmd(r.data.planEnd, -24, 0)
                    ? r.data.planStart
                    : fromDuration;
            return {
                organizationId,
                memberId,
                planId: plan?.id ?? null,
                createdById: userId ?? null,
                planName: (r.data.planName ?? plan?.name ?? 'Plano importado').slice(0, 80),
                price: r.data.planPrice ?? plan?.price ?? 0,
                startDate: ymdToDbDate(start),
                endDate: ymdToDbDate(r.data.planEnd),
                notes: 'Importado do sistema anterior',
            };
        };

        const memberFields = (r: AnalyzedRow) => ({
            name: r.data.name,
            cpf: r.data.cpf,
            phone: r.data.phone,
            email: r.data.email,
            birthDate: r.data.birthDate ? ymdToDbDate(r.data.birthDate) : null,
            notes: r.data.notes,
            planName: r.data.planEnd ? (r.data.planName ?? 'Plano importado').slice(0, 80) : null,
            planExpiresAt: r.data.planEnd ? ymdToDbDate(r.data.planEnd) : null,
            ...(r.data.status === 'INACTIVE'
                ? { memberStatus: 'INACTIVE' as const, deactivatedAt: nowDate, statusChangedAt: nowDate, deactivationReason: 'MANUAL' as const }
                : {}),
        });

        // Novos alunos em lotes (rápido mesmo com centenas de linhas)
        const creates = toApply.filter((r) => r.action === 'create');
        for (let i = 0; i < creates.length; i += 200) {
            const chunk = creates.slice(i, i + 200);
            const data = chunk.map((r) => ({
                organizationId,
                ...memberFields(r),
                accessCode: r.data.accessCode ?? genCode(),
                activeSince: nowDate, // a contagem de ausência começa no dia da importação
                // Data de cadastro = "aluno desde" do sistema antigo (o painel não conta como "novo no mês")
                ...(r.data.memberSince ? { createdAt: ymdToDbDate(r.data.memberSince) } : {}),
            }));
            try {
                const rowsCreated = await prismaClient.$transaction(async (tx) => {
                    const returned = await tx.member.createManyAndReturn({ data, select: { id: true, accessCode: true } });
                    // A senha da catraca é única e diferente em cada linha nova: liga o retorno à linha certa
                    const idByCode = new Map(returned.map((m) => [m.accessCode, m.id]));
                    const members = data.map((d) => ({ id: idByCode.get(d.accessCode)! }));
                    const ms = members.map((m, j) => membershipData(chunk[j]!, m.id)).filter((x): x is NonNullable<typeof x> => !!x);
                    if (ms.length) await tx.membership.createMany({ data: ms });
                    return { members, ms: ms.length };
                });
                rowsCreated.members.forEach((m, j) => results.push({ line: chunk[j]!.line, action: 'create', memberId: m.id, name: chunk[j]!.data.name }));
                created += rowsCreated.members.length;
                memberships += rowsCreated.ms;
            } catch {
                // Lote falhou (ex.: corrida com outro cadastro): tenta um a um para isolar a linha problemática
                for (let j = 0; j < chunk.length; j++) {
                    const r = chunk[j]!;
                    try {
                        const m = await prismaClient.$transaction(async (tx) => {
                            const member = await tx.member.create({ data: data[j]!, select: { id: true } });
                            const md = membershipData(r, member.id);
                            if (md) await tx.membership.create({ data: md });
                            return { member, hasMs: !!md };
                        });
                        results.push({ line: r.line, action: 'create', memberId: m.member.id, name: r.data.name });
                        created++;
                        if (m.hasMs) memberships++;
                    } catch (e) {
                        const code = (e as { code?: string }).code;
                        results.push({
                            line: r.line,
                            action: 'failed',
                            name: r.data.name,
                            message: code === 'P2002' ? 'CPF ou senha da catraca já cadastrados' : 'Erro ao gravar a linha',
                        });
                    }
                }
            }
        }

        // Atualizações: só preenche o que veio no arquivo; matrícula só se o vencimento for mais novo
        for (const r of toApply.filter((x) => x.action === 'update')) {
            try {
                await prismaClient.$transaction(async (tx) => {
                    const cur = await tx.member.findFirst({
                        where: { id: r.existingMemberId!, organizationId },
                        select: { id: true, cpf: true, notes: true, accessCode: true, planExpiresAt: true },
                    });
                    if (!cur) throw new Error('not found');
                    const data: Record<string, unknown> = { name: r.data.name };
                    if (r.data.cpf && !cur.cpf) data.cpf = r.data.cpf;
                    if (r.data.phone) data.phone = r.data.phone;
                    if (r.data.email) data.email = r.data.email;
                    if (r.data.birthDate) data.birthDate = ymdToDbDate(r.data.birthDate);
                    if (r.data.accessCode && !cur.accessCode) data.accessCode = r.data.accessCode;
                    if (r.data.notes && !(cur.notes ?? '').includes(r.data.notes)) {
                        data.notes = [cur.notes, r.data.notes].filter(Boolean).join('\n').slice(0, MAX_NOTES);
                    }
                    const newer = r.data.planEnd && (!cur.planExpiresAt || cur.planExpiresAt.toISOString().slice(0, 10) < r.data.planEnd);
                    if (newer) {
                        data.planName = (r.data.planName ?? 'Plano importado').slice(0, 80);
                        data.planExpiresAt = ymdToDbDate(r.data.planEnd!);
                        const md = membershipData(r, cur.id);
                        if (md) await tx.membership.create({ data: md });
                    }
                    await tx.member.update({ where: { id: cur.id }, data });
                    return newer;
                }).then((newer) => {
                    if (newer) memberships++;
                });
                results.push({ line: r.line, action: 'update', memberId: r.existingMemberId, name: r.data.name });
                updated++;
            } catch (e) {
                const code = (e as { code?: string }).code;
                results.push({ line: r.line, action: 'failed', name: r.data.name, message: code === 'P2002' ? 'CPF ou senha da catraca já usados por outro aluno' : 'Erro ao atualizar' });
            }
        }

        for (const r of analysis.rows.filter((x) => x.action === 'skip' || x.action === 'error')) {
            results.push({ line: r.line, action: r.action, name: r.data.name, message: (r.errors.length ? r.errors : r.warnings).join('; ') });
        }
        results.sort((a, b) => a.line - b.line);

        return {
            message: `Importação concluída: ${created} novo(s), ${updated} atualizado(s).`,
            summary: {
                total: analysis.summary.total,
                created,
                updated,
                skipped: analysis.summary.skip,
                errors: analysis.summary.error,
                failed: results.filter((r) => r.action === 'failed').length,
                memberships,
                plansCreated: createdPlans,
                importedOn: today,
            },
            results,
            rows: analysis.rows.filter((r) => r.errors.length || r.warnings.length),
        };
    }
}

export { GymMemberImportService };
