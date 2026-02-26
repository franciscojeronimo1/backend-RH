"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListTimeRecordsService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const CalculateTotalService_1 = require("./CalculateTotalService");
const dateUtils_1 = require("../../utils/dateUtils");
class ListTimeRecordsService {
    async execute(userId, targetUserId, options) {
        const queryUserId = targetUserId || userId;
        const date = options?.date;
        const periodDays = options?.periodDays;
        const month = options?.month;
        if (queryUserId !== userId) {
            const currentUser = await prismaClient_1.prismaClient.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!currentUser || currentUser.role !== 'ADMIN') {
                throw new Error('Você não tem permissão para ver registros de outros usuários');
            }
        }
        const filterCount = [date, periodDays, month].filter(Boolean).length;
        if (filterCount > 1) {
            throw new Error('Use apenas um filtro: date, periodDays ou month');
        }
        if (date && !(0, dateUtils_1.isValidDateString)(date)) {
            throw new Error('Data inválida. Use o formato YYYY-MM-DD');
        }
        if (month && !(0, dateUtils_1.isValidMonthString)(month)) {
            throw new Error('Mês inválido. Use o formato YYYY-MM');
        }
        if (periodDays !== undefined && (periodDays < 1 || periodDays > 366)) {
            throw new Error('periodDays deve ser entre 1 e 366');
        }
        let start;
        let end;
        let periodStartDate;
        let periodEndDate;
        if (periodDays !== undefined) {
            start = (0, dateUtils_1.getStartOfLastDays)(periodDays);
            end = (0, dateUtils_1.getCurrentLocalDate)();
            periodStartDate = (0, dateUtils_1.formatLocalDate)(start);
            periodEndDate = (0, dateUtils_1.formatLocalDate)(end);
        }
        else if (month) {
            start = (0, dateUtils_1.getStartOfMonth)(month);
            end = (0, dateUtils_1.getEndOfMonth)(month);
            periodStartDate = (0, dateUtils_1.formatLocalDate)(start);
            periodEndDate = (0, dateUtils_1.formatLocalDate)(end);
        }
        else {
            const targetDate = date ? (0, dateUtils_1.parseLocalDate)(date) : (0, dateUtils_1.getCurrentLocalDate)();
            start = (0, dateUtils_1.getStartOfDay)(targetDate);
            end = (0, dateUtils_1.getEndOfDay)(targetDate);
        }
        const records = await prismaClient_1.prismaClient.timeRecord.findMany({
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
        const calculateService = new CalculateTotalService_1.CalculateTotalService();
        const summary = calculateService.calculateDayTotal(records);
        if (periodStartDate && periodEndDate) {
            summary.startDate = periodStartDate;
            summary.endDate = periodEndDate;
            summary.date = periodStartDate;
        }
        return {
            records: records.map((record) => ({
                id: record.id,
                type: record.type,
                timestamp: record.timestamp,
                user: record.user,
            })),
            summary,
        };
    }
}
exports.ListTimeRecordsService = ListTimeRecordsService;
//# sourceMappingURL=ListTimeRecordsService.js.map