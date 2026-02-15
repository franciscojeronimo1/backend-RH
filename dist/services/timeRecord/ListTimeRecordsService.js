"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListTimeRecordsService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const CalculateTotalService_1 = require("./CalculateTotalService");
const dateUtils_1 = require("../../utils/dateUtils");
class ListTimeRecordsService {
    async execute(userId, targetUserId, date) {
        const queryUserId = targetUserId || userId;
        if (queryUserId !== userId) {
            const currentUser = await prismaClient_1.prismaClient.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!currentUser || currentUser.role !== 'ADMIN') {
                throw new Error('Você não tem permissão para ver registros de outros usuários');
            }
        }
        if (date && !(0, dateUtils_1.isValidDateString)(date)) {
            throw new Error('Data inválida. Use o formato YYYY-MM-DD');
        }
        const targetDate = date ? (0, dateUtils_1.parseLocalDate)(date) : (0, dateUtils_1.getCurrentLocalDate)();
        const startOfDay = (0, dateUtils_1.getStartOfDay)(targetDate);
        const endOfDay = (0, dateUtils_1.getEndOfDay)(targetDate);
        const records = await prismaClient_1.prismaClient.timeRecord.findMany({
            where: {
                userId: queryUserId,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay,
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