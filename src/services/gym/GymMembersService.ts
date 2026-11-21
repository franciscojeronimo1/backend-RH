import { prismaClient } from '../../config/prismaClient';
import { GymError } from './GymError';
import { GymSettingsService } from './GymSettingsService';
import { absenceBaseline } from './memberRules';
import {
    APP_TIMEZONE,
    diffCalendarDaysInAppTimezone,
    expirationDateToYmd,
    parseLocalDate,
} from '../../utils/dateUtils';
import dayjs from 'dayjs';

export type MemberFilter = 'ALL' | 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'PLAN_EXPIRING' | 'PLAN_EXPIRED';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export const memberPublicSelect = {
    id: true,
    name: true,
    cpf: true,
    phone: true,
    email: true,
    active: true,
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

type MemberRow = {
    lastCheckInAt: Date | null;
    activeSince: Date | null;
    createdAt: Date;
    planExpiresAt: Date | null;
};

/** Converte "YYYY-MM-DD" para Date em meia-noite UTC (padrão das colunas @db.Date do projeto). */
export function ymdToDbDate(ymd: string): Date {
    return new Date(`${ymd}T00:00:00.000Z`);
}

/** Acrescenta campos calculados para o front (dias sem treinar / dias para vencer). */
export function withComputed<T extends MemberRow>(member: T, now = new Date()) {
    const daysAbsent = Math.max(0, diffCalendarDaysInAppTimezone(absenceBaseline(member), now));
    const daysToPlanExpiry = member.planExpiresAt
        ? diffCalendarDaysInAppTimezone(now, parseLocalDate(expirationDateToYmd(member.planExpiresAt)))
        : null;
    return {
        ...member,
        planExpiresAt: member.planExpiresAt ? expirationDateToYmd(member.planExpiresAt) : null,
        daysAbsent,
        daysToPlanExpiry,
    };
}

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
        const todayYmd = dayjs().tz(APP_TIMEZONE).format('YYYY-MM-DD');
        const today = ymdToDbDate(todayYmd);
        let orderBy: Record<string, unknown>[] = [{ name: 'asc' }];

        switch (params.filter) {
            case 'ACTIVE':
                and.push({ active: true, memberStatus: 'ACTIVE' });
                break;
            case 'AT_RISK':
                and.push({ active: true, memberStatus: 'AT_RISK' });
                orderBy = [{ lastCheckInAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }];
                break;
            case 'INACTIVE':
                and.push({ OR: [{ active: false }, { memberStatus: 'INACTIVE' }] });
                orderBy = [{ deactivatedAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }];
                break;
            case 'PLAN_EXPIRING': {
                const limitDate = ymdToDbDate(
                    dayjs.tz(todayYmd, APP_TIMEZONE).add(settings.planExpiringNoticeDays, 'day').format('YYYY-MM-DD')
                );
                and.push({ active: true, planExpiresAt: { gte: today, lte: limitDate } });
                orderBy = [{ planExpiresAt: 'asc' }];
                break;
            }
            case 'PLAN_EXPIRED':
                and.push({ active: true, planExpiresAt: { lt: today } });
                orderBy = [{ planExpiresAt: 'asc' }];
                break;
            default:
                break;
        }

        const searchTerm = params.search?.trim();
        if (searchTerm) {
            const digits = searchTerm.replace(/\D/g, '');
            const or: Record<string, unknown>[] = [{ name: { contains: searchTerm, mode: 'insensitive' } }];
            if (digits.length > 0) {
                or.push({ cpf: { contains: digits } }, { phone: { contains: digits } });
            }
            and.push({ OR: or });
        }
        if (and.length) where.AND = and;

        const [members, total] = await Promise.all([
            prismaClient.client.findMany({
                where,
                select: memberPublicSelect,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaClient.client.count({ where }),
        ]);

        const now = new Date();
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            members: members.map((m) => withComputed(m, now)),
            pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
        };
    }

    private async findOrFail(organizationId: string, id: string) {
        const member = await prismaClient.client.findFirst({
            where: { id, organizationId },
            select: memberPublicSelect,
        });
        if (!member) throw new GymError('Aluno não encontrado', 404);
        return member;
    }

    async get(organizationId: string, id: string) {
        const member = await this.findOrFail(organizationId, id);
        const recentCheckIns = await prismaClient.checkIn.findMany({
            where: { organizationId, clientId: id },
            orderBy: { checkedInAt: 'desc' },
            take: 20,
            select: { id: true, checkedInAt: true },
        });
        return { member: withComputed(member), recentCheckIns };
    }

    async update(
        organizationId: string,
        id: string,
        data: { planName?: string | null; planExpiresAt?: string | null; autoControl?: boolean }
    ) {
        await this.findOrFail(organizationId, id);
        const updateData: Record<string, unknown> = {};
        if (data.planName !== undefined) updateData.planName = data.planName;
        if (data.planExpiresAt !== undefined) {
            updateData.planExpiresAt = data.planExpiresAt ? ymdToDbDate(data.planExpiresAt) : null;
        }
        if (data.autoControl !== undefined) updateData.autoControl = data.autoControl;
        const member = await prismaClient.client.update({
            where: { id },
            data: updateData,
            select: memberPublicSelect,
        });
        return withComputed(member);
    }

    async deactivate(organizationId: string, id: string) {
        await this.findOrFail(organizationId, id);
        const now = new Date();
        const member = await prismaClient.client.update({
            where: { id },
            data: {
                active: false,
                memberStatus: 'INACTIVE',
                statusChangedAt: now,
                deactivatedAt: now,
                deactivationReason: 'MANUAL',
            },
            select: memberPublicSelect,
        });
        return withComputed(member);
    }

    async reactivate(organizationId: string, id: string) {
        await this.findOrFail(organizationId, id);
        const now = new Date();
        const member = await prismaClient.client.update({
            where: { id },
            data: {
                active: true,
                memberStatus: 'ACTIVE',
                statusChangedAt: now,
                // Recomeça a contagem de ausência a partir de hoje
                activeSince: now,
                deactivatedAt: null,
                deactivationReason: null,
            },
            select: memberPublicSelect,
        });
        return withComputed(member);
    }
}

export { GymMembersService };
