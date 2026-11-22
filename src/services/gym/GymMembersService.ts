import { randomInt } from 'crypto';
import { prismaClient } from '../../config/prismaClient';
import { GymError } from './GymError';
import { GymSettingsService } from './GymSettingsService';
import { absenceBaseline } from './memberRules';
import { diffCalendarDaysInAppTimezone, parseLocalDate } from '../../utils/dateUtils';
import { addToYmd, dbDateToYmd, todayYmd, ymdToDbDate } from './gymDates';
import { rethrowUnique } from './gymPrismaErrors';

export type MemberFilter = 'ALL' | 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'PLAN_EXPIRING' | 'PLAN_EXPIRED' | 'NO_PLAN';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/** Campos do aluno devolvidos nas listas (sem a senha da catraca). */
export const memberPublicSelect = {
    id: true,
    name: true,
    cpf: true,
    phone: true,
    email: true,
    birthDate: true,
    memberStatus: true,
    lastCheckInAt: true,
    activeSince: true,
    createdAt: true,
    planName: true,
    planExpiresAt: true,
    autoControl: true,
    statusChangedAt: true,
    deactivatedAt: true,
    deactivationReason: true,
} as const;

/** Detalhe do aluno: inclui senha da catraca e observações. */
export const memberDetailSelect = { ...memberPublicSelect, accessCode: true, notes: true } as const;

type MemberRow = {
    lastCheckInAt: Date | null;
    activeSince: Date | null;
    createdAt: Date;
    planExpiresAt: Date | null;
    birthDate?: Date | null;
};

export const PAYMENT_METHODS = ['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER'] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

/** Acrescenta campos calculados para o front (dias sem treinar / dias para vencer) e normaliza datas. */
export function withComputed<T extends MemberRow>(member: T, now = new Date()) {
    const daysAbsent = Math.max(0, diffCalendarDaysInAppTimezone(absenceBaseline(member), now));
    const planYmd = dbDateToYmd(member.planExpiresAt);
    const daysToPlanExpiry = planYmd ? diffCalendarDaysInAppTimezone(now, parseLocalDate(planYmd)) : null;
    return {
        ...member,
        planExpiresAt: planYmd,
        ...(member.birthDate !== undefined ? { birthDate: dbDateToYmd(member.birthDate) } : {}),
        daysAbsent,
        daysToPlanExpiry,
    };
}

export interface MemberInput {
    name?: string;
    cpf?: string | null;
    phone?: string | null;
    email?: string | null;
    birthDate?: string | null;
    notes?: string | null;
    accessCode?: string | null;
    autoControl?: boolean;
}

const UNIQUE_MESSAGES = {
    accessCode: 'Essa senha da catraca já é usada por outro aluno.',
    cpf: 'Já existe um aluno com esse CPF.',
};

class GymMembersService {
    async list(
        organizationId: string,
        params: { filter?: MemberFilter; search?: string; page?: number; limit?: number }
    ) {
        const settings = await new GymSettingsService().get(organizationId);
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));

        const where: Record<string, unknown> = { organizationId };
        const and: Record<string, unknown>[] = [];
        const today = todayYmd();
        const todayDb = ymdToDbDate(today);
        let orderBy: Record<string, unknown>[] = [{ name: 'asc' }];

        switch (params.filter) {
            case 'ACTIVE':
                and.push({ memberStatus: 'ACTIVE' });
                break;
            case 'AT_RISK':
                and.push({ memberStatus: 'AT_RISK' });
                orderBy = [{ lastCheckInAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }];
                break;
            case 'INACTIVE':
                and.push({ memberStatus: 'INACTIVE' });
                orderBy = [{ deactivatedAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }];
                break;
            case 'PLAN_EXPIRING': {
                const limitDate = ymdToDbDate(addToYmd(today, 0, settings.planExpiringNoticeDays));
                and.push({ memberStatus: { not: 'INACTIVE' }, planExpiresAt: { gte: todayDb, lte: limitDate } });
                orderBy = [{ planExpiresAt: 'asc' }];
                break;
            }
            case 'PLAN_EXPIRED':
                and.push({ memberStatus: { not: 'INACTIVE' }, planExpiresAt: { lt: todayDb } });
                orderBy = [{ planExpiresAt: 'asc' }];
                break;
            case 'NO_PLAN':
                and.push({ memberStatus: { not: 'INACTIVE' }, planExpiresAt: null });
                break;
            default:
                break;
        }

        const searchTerm = params.search?.trim();
        if (searchTerm) {
            const digits = searchTerm.replace(/\D/g, '');
            const or: Record<string, unknown>[] = [{ name: { contains: searchTerm, mode: 'insensitive' } }];
            if (digits.length > 0) {
                or.push({ cpf: { contains: digits } }, { phone: { contains: digits } }, { accessCode: digits });
            }
            and.push({ OR: or });
        }
        if (and.length) where.AND = and;

        const [members, total] = await Promise.all([
            prismaClient.member.findMany({
                where,
                select: memberPublicSelect,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaClient.member.count({ where }),
        ]);

        const now = new Date();
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            members: members.map((m) => withComputed(m, now)),
            pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
        };
    }

    async findOrFail(organizationId: string, id: string) {
        const member = await prismaClient.member.findFirst({
            where: { id, organizationId },
            select: memberDetailSelect,
        });
        if (!member) throw new GymError('Aluno não encontrado', 404);
        return member;
    }

    /** Gera uma senha numérica de 6 dígitos que ainda não existe na academia. */
    async generateAccessCode(organizationId: string): Promise<string> {
        for (let i = 0; i < 20; i++) {
            const code = String(randomInt(100000, 1000000));
            const exists = await prismaClient.member.findFirst({
                where: { organizationId, accessCode: code },
                select: { id: true },
            });
            if (!exists) return code;
        }
        throw new GymError('Não foi possível gerar a senha da catraca. Tente novamente.', 500);
    }

    private toData(data: MemberInput) {
        const d: Record<string, unknown> = {};
        if (data.name !== undefined) d.name = data.name.trim();
        if (data.cpf !== undefined) d.cpf = data.cpf;
        if (data.phone !== undefined) d.phone = data.phone;
        if (data.email !== undefined) d.email = data.email;
        if (data.birthDate !== undefined) d.birthDate = data.birthDate ? ymdToDbDate(data.birthDate) : null;
        if (data.notes !== undefined) d.notes = data.notes;
        if (data.accessCode !== undefined) d.accessCode = data.accessCode;
        if (data.autoControl !== undefined) d.autoControl = data.autoControl;
        return d;
    }

    async create(organizationId: string, data: MemberInput & { name: string }) {
        const accessCode = data.accessCode || (await this.generateAccessCode(organizationId));
        try {
            const member = await prismaClient.member.create({
                data: { ...this.toData(data), name: data.name.trim(), organizationId, accessCode },
                select: memberDetailSelect,
            });
            return withComputed(member);
        } catch (error) {
            rethrowUnique(error, UNIQUE_MESSAGES);
        }
    }

    async get(organizationId: string, id: string) {
        const member = await this.findOrFail(organizationId, id);
        const [recentCheckIns, credentials] = await Promise.all([
            prismaClient.accessEvent.findMany({
                where: { organizationId, memberId: id },
                orderBy: { occurredAt: 'desc' },
                take: 20,
                select: { id: true, occurredAt: true, method: true, direction: true, result: true, reason: true },
            }),
            prismaClient.memberCredential.findMany({
                where: { organizationId, memberId: id },
                select: { id: true, type: true, label: true, active: true, deviceId: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        return { member: withComputed(member), recentCheckIns, credentials };
    }

    async update(organizationId: string, id: string, data: MemberInput) {
        await this.findOrFail(organizationId, id);
        if (data.accessCode === null) {
            // Apagar a senha não é permitido: o aluno ficaria sem acesso. Gera outra.
            data = { ...data, accessCode: await this.generateAccessCode(organizationId) };
        }
        try {
            const member = await prismaClient.member.update({
                where: { id },
                data: this.toData(data),
                select: memberDetailSelect,
            });
            return withComputed(member);
        } catch (error) {
            rethrowUnique(error, UNIQUE_MESSAGES);
        }
    }

    async remove(organizationId: string, id: string) {
        await this.findOrFail(organizationId, id);
        await prismaClient.member.delete({ where: { id } });
        return { message: 'Aluno excluído' };
    }

    async deactivate(organizationId: string, id: string) {
        await this.findOrFail(organizationId, id);
        const now = new Date();
        const member = await prismaClient.member.update({
            where: { id },
            data: {
                memberStatus: 'INACTIVE',
                statusChangedAt: now,
                deactivatedAt: now,
                deactivationReason: 'MANUAL',
            },
            select: memberDetailSelect,
        });
        return withComputed(member);
    }

    async reactivate(organizationId: string, id: string, isAdmin = false) {
        const current = await this.findOrFail(organizationId, id);
        // Quem foi desativado manualmente pelo dono só pode ser reativado por um administrador.
        if (!isAdmin && current.memberStatus === 'INACTIVE' && current.deactivationReason === 'MANUAL') {
            throw new GymError('Só um administrador pode reativar um aluno desativado manualmente.', 403, 'ADMIN_REQUIRED');
        }
        const now = new Date();
        const member = await prismaClient.member.update({
            where: { id },
            data: {
                memberStatus: 'ACTIVE',
                statusChangedAt: now,
                // Recomeça a contagem de ausência a partir de hoje
                activeSince: now,
                deactivatedAt: null,
                deactivationReason: null,
            },
            select: memberDetailSelect,
        });
        return withComputed(member);
    }
}

export { GymMembersService };
