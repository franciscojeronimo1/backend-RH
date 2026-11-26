/**
 * Leitura e normalização do arquivo de alunos exportado por outro sistema (ex.: Secullum Academia.Net).
 *
 * Aceita CSV/TXT (separador ; , ou TAB, UTF-8 ou Latin-1/Windows-1252) e planilhas XLSX/XLS.
 * O cabeçalho pode estar depois de linhas de título do relatório; as colunas são reconhecidas pelo nome
 * (sem acento, sem diferenciar maiúsculas) e o mapeamento pode ser ajustado pelo usuário.
 */
import * as XLSX from 'xlsx';

export type ImportField =
    | 'name'
    | 'cpf'
    | 'phone'
    | 'phone2'
    | 'email'
    | 'birthDate'
    | 'accessCode'
    | 'externalCode'
    | 'rg'
    | 'gender'
    | 'address'
    | 'district'
    | 'city'
    | 'state'
    | 'zip'
    | 'status'
    | 'planName'
    | 'planPrice'
    | 'planStart'
    | 'memberSince'
    | 'planEnd'
    | 'notes';

export type ImportMapping = Partial<Record<ImportField, number | null>>;

export const IMPORT_FIELDS: { key: ImportField; label: string; required?: boolean; aliases: string[] }[] = [
    { key: 'name', label: 'Nome', required: true, aliases: ['nome', 'nome completo', 'nome do aluno', 'aluno', 'pessoa', 'nome da pessoa', 'cliente', 'nome cliente'] },
    { key: 'cpf', label: 'CPF', aliases: ['cpf', 'cpf cnpj', 'cnpj cpf', 'n cpf', 'numero cpf', 'documento cpf'] },
    { key: 'phone', label: 'Celular / WhatsApp', aliases: ['celular', 'telefone celular', 'fone celular', 'whatsapp', 'whats', 'cel', 'telefone', 'fone', 'tel', 'telefone 1', 'telefone1', 'fone 1', 'contato'] },
    { key: 'phone2', label: 'Outro telefone', aliases: ['telefone residencial', 'fone residencial', 'telefone fixo', 'fone fixo', 'telefone 2', 'telefone2', 'fone 2', 'telefone comercial', 'fone comercial', 'recado', 'telefone recado'] },
    { key: 'email', label: 'Email', aliases: ['email', 'e mail', 'endereco eletronico', 'correio eletronico'] },
    { key: 'birthDate', label: 'Data de nascimento', aliases: ['nascimento', 'data nascimento', 'data de nascimento', 'dt nascimento', 'dt nasc', 'data nasc', 'nasc', 'aniversario', 'data aniversario'] },
    { key: 'accessCode', label: 'Senha da catraca', aliases: ['senha', 'senha acesso', 'senha de acesso', 'senha catraca', 'senha da catraca', 'codigo de acesso', 'codigo acesso', 'cartao', 'numero cartao', 'n cartao', 'cracha', 'numero cracha', 'n cracha', 'matricula catraca'] },
    { key: 'externalCode', label: 'Código no sistema antigo', aliases: ['numero', 'n', 'no', 'codigo', 'cod', 'codigo pessoa', 'codigo aluno', 'cod aluno', 'id', 'matricula', 'n matricula', 'numero matricula', 'registro', 'numero pessoa'] },
    { key: 'rg', label: 'RG', aliases: ['rg', 'identidade', 'rg ie', 'carteira identidade'] },
    { key: 'gender', label: 'Sexo', aliases: ['sexo', 'genero'] },
    { key: 'address', label: 'Endereço', aliases: ['endereco', 'logradouro', 'rua', 'endereco completo'] },
    { key: 'district', label: 'Bairro', aliases: ['bairro'] },
    { key: 'city', label: 'Cidade', aliases: ['cidade', 'municipio'] },
    { key: 'state', label: 'UF', aliases: ['uf', 'estado'] },
    { key: 'zip', label: 'CEP', aliases: ['cep'] },
    { key: 'status', label: 'Situação (ativo/inativo)', aliases: ['situacao', 'status', 'ativo', 'situacao aluno', 'situacao pessoa', 'situacao cadastro'] },
    { key: 'planName', label: 'Plano / serviço', aliases: ['plano', 'servico', 'servicos', 'modalidade', 'plano servico', 'nome do plano', 'nome plano', 'servico contratado', 'descricao servico'] },
    { key: 'planPrice', label: 'Valor do plano', aliases: ['valor', 'valor plano', 'valor do plano', 'valor mensalidade', 'mensalidade', 'valor servico', 'preco', 'valor mensal'] },
    { key: 'planStart', label: 'Início do plano atual', aliases: ['inicio', 'data inicio', 'inicio plano', 'inicio do plano', 'data inicio plano', 'inicio servico', 'data inicio servico', 'inicio vigencia'] },
    { key: 'memberSince', label: 'Data de inscrição / cadastro', aliases: ['data inscricao', 'inscricao', 'data cadastro', 'cadastro', 'data de cadastro', 'data matricula', 'data de matricula', 'admissao', 'data admissao', 'dt inscricao', 'dt cadastro', 'data de inscricao', 'aluno desde', 'cliente desde'] },
    { key: 'planEnd', label: 'Vencimento do plano', aliases: ['vencimento', 'data vencimento', 'data de vencimento', 'vencto', 'dt vencimento', 'validade', 'data validade', 'valido ate', 'proximo vencimento', 'venc', 'vencimento plano', 'fim plano', 'data fim', 'termino'] },
    { key: 'notes', label: 'Observações', aliases: ['observacao', 'observacoes', 'obs', 'anotacoes', 'comentario'] },
];

export const MAX_IMPORT_ROWS = 5000;

export type ParsedTable = {
    format: 'csv' | 'xlsx' | 'xls';
    encoding?: 'utf-8' | 'latin1';
    delimiter?: string;
    sheetName?: string;
    rows: string[][];
};

export class ImportFileError extends Error {}

/** Texto normalizado para comparar cabeçalhos: minúsculo, sem acento, só letras/números. */
export function normalizeHeader(s: string): string {
    return String(s ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[º°ª]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function decodeText(buf: Buffer): { text: string; encoding: 'utf-8' | 'latin1' } {
    let b = buf;
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) b = b.subarray(3);
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(b);
        return { text, encoding: 'utf-8' };
    } catch {
        // Exportações do Windows (Secullum) costumam vir em Windows-1252/Latin-1.
        return { text: new TextDecoder('windows-1252').decode(b), encoding: 'latin1' };
    }
}

function detectDelimiter(text: string): string {
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 30);
    let best = ';';
    let bestScore = -1;
    for (const d of [';', '\t', ',', '|']) {
        const counts = lines.map((l) => splitCsvLine(l, d).length - 1);
        const withSep = counts.filter((c) => c > 0);
        if (!withSep.length) continue;
        // Prefere o separador que aparece em mais linhas e de forma mais constante
        const freq: Record<number, number> = {};
        withSep.forEach((c) => (freq[c] = (freq[c] ?? 0) + 1));
        const mode = Math.max(...Object.values(freq));
        const score = mode * 100 + withSep.length;
        if (score > bestScore) {
            bestScore = score;
            best = d;
        }
    }
    return best;
}

function splitCsvLine(line: string, d: string): string[] {
    return parseCsv(line, d)[0] ?? [];
}

/** Parser CSV com aspas ("a;b", "" escapado, quebra de linha dentro de aspas). */
export function parseCsv(text: string, d: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else inQuotes = false;
            } else cell += ch;
        } else if (ch === '"' && cell.trim() === '') {
            inQuotes = true;
            cell = '';
        } else if (ch === d) {
            row.push(cell);
            cell = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else cell += ch;
    }
    if (cell !== '' || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

function sheetToRows(wb: XLSX.WorkBook): { rows: string[][]; sheetName: string } {
    // Primeira aba que tenha dados
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws || !ws['!ref']) continue;
        const range = XLSX.utils.decode_range(ws['!ref']);
        const rows: string[][] = [];
        for (let r = range.s.r; r <= range.e.r; r++) {
            const row: string[] = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
                row.push(cellToString(cell));
            }
            rows.push(row);
        }
        if (rows.some((r) => r.some((v) => v.trim()))) return { rows, sheetName };
    }
    return { rows: [], sheetName: wb.SheetNames[0] ?? '' };
}

function cellToString(cell: XLSX.CellObject | undefined): string {
    if (!cell || cell.v === undefined || cell.v === null) return '';
    if (cell.t === 'd' && cell.v instanceof Date) {
        const d = cell.v;
        return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
    if (cell.t === 'n') {
        const fmt = typeof cell.z === 'string' ? cell.z : '';
        if (fmt && XLSX.SSF.is_date(fmt)) {
            const p = XLSX.SSF.parse_date_code(cell.v as number);
            if (p) return `${pad2(p.d)}/${pad2(p.m)}/${p.y}`;
        }
        const n = cell.v as number;
        // Inteiros grandes (CPF, telefone) sem notação científica
        return Number.isInteger(n) ? n.toFixed(0) : String(n);
    }
    if (cell.t === 'b') return cell.v ? 'Sim' : 'Não';
    return String(cell.v);
}

/** Lê o arquivo (base64) e devolve a tabela crua como texto. */
export function readImportFile(base64: string, fileName = ''): ParsedTable {
    const clean = base64.includes(',') && base64.startsWith('data:') ? base64.split(',')[1]! : base64;
    const buf = Buffer.from(clean, 'base64');
    if (!buf.length) throw new ImportFileError('Arquivo vazio.');

    const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // XLSX
    const isOle = buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0; // XLS antigo
    const lower = fileName.toLowerCase();

    let table: ParsedTable;
    if (isZip || isOle) {
        let wb: XLSX.WorkBook;
        try {
            wb = XLSX.read(buf, { type: 'buffer', cellDates: false, cellNF: true, cellText: false, dense: false });
        } catch {
            throw new ImportFileError('Não foi possível ler a planilha. Salve como .xlsx ou .csv e tente de novo.');
        }
        const { rows, sheetName } = sheetToRows(wb);
        table = { format: isZip ? 'xlsx' : 'xls', sheetName, rows };
    } else if (/\.(xlsx|xls)$/.test(lower)) {
        throw new ImportFileError('A planilha parece corrompida. Salve de novo como .xlsx ou .csv.');
    } else {
        const { text, encoding } = decodeText(buf);
        // Exportação "Excel" em HTML/XML (alguns geradores de relatório) → deixa o SheetJS tentar
        if (/^\s*<(html|\?xml|table)/i.test(text)) {
            try {
                const wb = XLSX.read(text, { type: 'string', cellDates: false, cellNF: true });
                const { rows, sheetName } = sheetToRows(wb);
                return finish({ format: 'xls', sheetName, encoding, rows });
            } catch {
                throw new ImportFileError('Formato de arquivo não reconhecido. Use .csv, .txt, .xlsx ou .xls.');
            }
        }
        const delimiter = detectDelimiter(text);
        table = { format: 'csv', encoding, delimiter, rows: parseCsv(text, delimiter) };
    }
    return finish(table);
}

function finish(table: ParsedTable): ParsedTable {
    // Remove espaços extras e linhas totalmente vazias do fim
    const rows = table.rows.map((r) => r.map((v) => String(v ?? '').replace(/\u00a0/g, ' ').trim()));
    while (rows.length && rows[rows.length - 1]!.every((v) => !v)) rows.pop();
    if (!rows.length) throw new ImportFileError('O arquivo não tem linhas.');
    return { ...table, rows };
}

function fieldForHeader(header: string): ImportField | null {
    const h = normalizeHeader(header);
    if (!h) return null;
    for (const f of IMPORT_FIELDS) if (f.aliases.includes(h)) return f.key;
    return null;
}

/** Acha a linha de cabeçalho (pode haver título do relatório antes) e o mapeamento automático. */
export function detectHeader(rows: string[][]): { headerRow: number; mapping: ImportMapping } {
    let best = { headerRow: 0, score: 0, mapping: {} as ImportMapping };
    const limit = Math.min(rows.length, 25);
    for (let r = 0; r < limit; r++) {
        const mapping = autoMapping(rows[r]!);
        const score = Object.keys(mapping).length + (mapping.name !== undefined ? 2 : 0);
        if (score > best.score) best = { headerRow: r, score, mapping };
    }
    return { headerRow: best.headerRow, mapping: best.mapping };
}

export function autoMapping(header: string[]): ImportMapping {
    const mapping: ImportMapping = {};
    header.forEach((h, i) => {
        const f = fieldForHeader(h);
        if (f && mapping[f] === undefined) mapping[f] = i;
    });
    // "Telefone" e "Celular" juntos: o celular vira o principal (WhatsApp) e o outro vai para "Outro telefone"
    const cel = header.findIndex((h) => /^(celular|telefone celular|fone celular|whatsapp|whats|cel)$/.test(normalizeHeader(h)));
    if (cel >= 0 && mapping.phone !== undefined && mapping.phone !== cel) {
        if (mapping.phone2 === undefined) mapping.phone2 = mapping.phone;
        mapping.phone = cel;
    }
    return mapping;
}

/* ----------------------------- normalização de valores ----------------------------- */

export function onlyDigits(s: string): string {
    return String(s ?? '').replace(/\D/g, '');
}

export function isValidCpf(cpf: string): boolean {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    const calc = (len: number) => {
        let sum = 0;
        for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };
    return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** CPF só com dígitos; planilhas perdem zeros à esquerda (9-10 dígitos) → completa. */
export function normalizeCpf(raw: string): { value: string | null; invalid: boolean } {
    const d = onlyDigits(raw);
    if (!d) return { value: null, invalid: false };
    const padded = d.length >= 9 && d.length < 11 ? d.padStart(11, '0') : d;
    return isValidCpf(padded) ? { value: padded, invalid: false } : { value: null, invalid: true };
}

/** Telefone só com dígitos (DDD + número); tira +55. */
export function normalizePhone(raw: string): { value: string | null; invalid: boolean } {
    let d = onlyDigits(raw);
    if (!d) return { value: null, invalid: false };
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length < 10 || d.length > 11) return { value: null, invalid: true };
    return { value: d, invalid: false };
}

export function normalizeEmail(raw: string): { value: string | null; invalid: boolean } {
    const e = String(raw ?? '').trim().toLowerCase();
    if (!e) return { value: null, invalid: false };
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? { value: e, invalid: false } : { value: null, invalid: true };
}

function validYmd(y: number, m: number, d: number): string | null {
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Datas brasileiras dd/mm/aaaa (também dd/mm/aa, dd-mm-aaaa, dd.mm.aaaa, aaaa-mm-dd, número serial do Excel). */
export function parseDateBR(raw: string, now = new Date()): { value: string | null; invalid: boolean } {
    const s = String(raw ?? '').trim();
    if (!s || /^0?0[/.-]0?0[/.-]0{2,4}$/.test(s)) return { value: null, invalid: false };
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
    if (m) {
        const v = validYmd(+m[1]!, +m[2]!, +m[3]!);
        return { value: v, invalid: !v };
    }
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
    if (m) {
        let y = +m[3]!;
        if (m[3]!.length === 2) {
            const cur = now.getFullYear() % 100;
            y += y > cur + 10 ? 1900 : 2000;
        }
        const v = validYmd(y, +m[2]!, +m[1]!);
        return { value: v, invalid: !v };
    }
    if (/^\d{5}(\.\d+)?$/.test(s)) {
        const p = XLSX.SSF.parse_date_code(Number(s));
        const v = p ? validYmd(p.y, p.m, p.d) : null;
        return { value: v, invalid: !v };
    }
    return { value: null, invalid: true };
}

/** Valor em reais: "R$ 1.234,56", "99,90", "99.9". */
export function parseMoney(raw: string): { value: number | null; invalid: boolean } {
    let s = String(raw ?? '').replace(/r\$|\s/gi, '');
    if (!s) return { value: null, invalid: false };
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return { value: null, invalid: true };
    return { value: Math.round(n * 100) / 100, invalid: false };
}

const INACTIVE_WORDS = ['inativo', 'inativa', 'bloqueado', 'bloqueada', 'cancelado', 'cancelada', 'desativado', 'desativada', 'nao', 'n', 'false', '0', 'excluido', 'trancado', 'trancada', 'suspenso'];
const ACTIVE_WORDS = ['ativo', 'ativa', 'sim', 's', 'true', '1', 'liberado', 'normal', 'regular', 'em dia'];

export function parseStatus(raw: string): { value: 'ACTIVE' | 'INACTIVE' | null; invalid: boolean } {
    const s = normalizeHeader(raw);
    if (!s) return { value: null, invalid: false };
    if (INACTIVE_WORDS.includes(s)) return { value: 'INACTIVE', invalid: false };
    if (ACTIVE_WORDS.includes(s)) return { value: 'ACTIVE', invalid: false };
    return { value: null, invalid: true };
}

/** Nome para comparação de duplicados. */
export function nameKey(name: string): string {
    return normalizeHeader(name).replace(/\s+/g, ' ');
}

/** Nome com capitalização amigável quando vem TODO EM MAIÚSCULAS. */
export function prettifyName(name: string): string {
    const n = name.replace(/\s+/g, ' ').trim();
    if (n !== n.toUpperCase() || !/[A-ZÀ-Ý]/.test(n)) return n;
    const lower = ['da', 'de', 'do', 'das', 'dos', 'e'];
    return n
        .toLowerCase()
        .split(' ')
        .map((w, i) => (i > 0 && lower.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ');
}

/** Duração em meses pelo nome do plano ("Trimestral" = 3); padrão 1. */
export function monthsFromPlanName(name: string | null | undefined): number {
    const n = normalizeHeader(name ?? '');
    if (/\banual\b|\b12 meses\b/.test(n)) return 12;
    if (/semestral|\b6 meses\b/.test(n)) return 6;
    if (/quadrimestral|\b4 meses\b/.test(n)) return 4;
    if (/trimestral|\b3 meses\b/.test(n)) return 3;
    if (/bimestral|\b2 meses\b/.test(n)) return 2;
    return 1;
}
