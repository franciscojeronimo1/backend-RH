import { prismaClient } from '../../config/prismaClient';
import { CalculateTotalService } from './CalculateTotalService';
import {
    getStartOfDay,
    getEndOfDay,
    getCurrentLocalDate,
    parseLocalDate,
    isValidDateString,
    getStartOfLastDays,
    getStartOfMonth,
    getEndOfMonth,
    isValidMonthString,
    formatLocalDate,
} from '../../utils/dateUtils';

export interface ListTimeRecordsOptions {
    date?: string;
    /** Últimos N dias (ex: 30 = últimos 30 dias) */
    periodDays?: number;
    /** Mês no formato YYYY-MM (ex: 2025-02) */
    month?: string;
}

class ListTimeRecordsService {
    async execute(
        userId: string,
        targetUserId: string | null,
        options?: ListTimeRecordsOptions
    ) {
        const queryUserId = targetUserId || userId;
        const date = options?.date;
        const periodDays = options?.periodDays;
        const month = options?.month;

        // Se tentar ver registros de outro usuário, precisa ser ADMIN
        if (queryUserId !== userId) {
            const currentUser = await prismaClient.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            if (!currentUser || currentUser.role !== 'ADMIN') {
                throw new Error('Você não tem permissão para ver registros de outros usuários');
            }
        }

        // Apenas um tipo de filtro por vez: date, periodDays ou month
        const filterCount = [date, periodDays, month].filter(Boolean).length;
        if (filterCount > 1) {
            throw new Error('Use apenas um filtro: date, periodDays ou month');
        }

        if (date && !isValidDateString(date)) {
            throw new Error('Data inválida. Use o formato YYYY-MM-DD');
        }
        if (month && !isValidMonthString(month)) {
            throw new Error('Mês inválido. Use o formato YYYY-MM');
        }
        if (periodDays !== undefined && (periodDays < 1 || periodDays > 366)) {
            throw new Error('periodDays deve ser entre 1 e 366');
        }

        let start: Date;
        let end: Date;
        let periodStartDate: string | undefined;
        let periodEndDate: string | undefined;

        if (periodDays !== undefined) {
            start = getStartOfLastDays(periodDays);
            end = getCurrentLocalDate();
            periodStartDate = formatLocalDate(start);
            periodEndDate = formatLocalDate(end);
        } else if (month) {
            start = getStartOfMonth(month);
            end = getEndOfMonth(month);
            periodStartDate = formatLocalDate(start);
            periodEndDate = formatLocalDate(end);
        } else {
            const targetDate = date ? parseLocalDate(date) : getCurrentLocalDate();
            start = getStartOfDay(targetDate);
            end = getEndOfDay(targetDate);
        }

        const records = await prismaClient.timeRecord.findMany({
            where: {
                userId: queryUserId,
                timestamp: {
                    gte: start,
                    lte: end,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        const calculateService = new CalculateTotalService();
        const summary = calculateService.calculateDayTotal(records);

        if (periodStartDate && periodEndDate) {
            summary.startDate = periodStartDate;
            summary.endDate = periodEndDate;
            summary.date = periodStartDate; // para compatibilidade
        }

        type TimeRecordWithUser = (typeof records)[number];
        return {
            records: records.map((record: TimeRecordWithUser) => ({
                id: record.id,
                type: record.type,
                timestamp: record.timestamp,
                user: record.user,
            })),
            summary,
        };
    }
}

export { ListTimeRecordsService };

