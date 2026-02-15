"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopTimeRecordService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const enums_1 = require("../../../generated/prisma/enums");
const ValidateTimeRecordService_1 = require("./ValidateTimeRecordService");
const CalculateTotalService_1 = require("./CalculateTotalService");
const dateUtils_1 = require("../../utils/dateUtils");
class StopTimeRecordService {
    async execute(userId) {
        const validateService = new ValidateTimeRecordService_1.ValidateTimeRecordService();
        const calculateService = new CalculateTotalService_1.CalculateTotalService();
        const now = (0, dateUtils_1.getCurrentLocalDate)();
        const canStop = await validateService.canStop(userId, now);
        if (!canStop) {
            throw new Error('Você precisa iniciar o trabalho antes de parar.');
        }
        const timeRecord = await prismaClient_1.prismaClient.timeRecord.create({
            data: {
                userId,
                type: enums_1.TimeRecordType.STOP,
                timestamp: now,
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
        });
        const startOfDay = (0, dateUtils_1.getStartOfDay)(now);
        const endOfDay = (0, dateUtils_1.getEndOfDay)(now);
        const dayRecords = await prismaClient_1.prismaClient.timeRecord.findMany({
            where: {
                userId,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                timestamp: 'asc',
            },
        });
        const summary = calculateService.calculateDayTotal(dayRecords);
        return {
            id: timeRecord.id,
            type: timeRecord.type,
            timestamp: timeRecord.timestamp,
            user: timeRecord.user,
            summary,
            message: 'Trabalho parado com sucesso',
        };
    }
}
exports.StopTimeRecordService = StopTimeRecordService;
//# sourceMappingURL=StopTimeRecordService.js.map