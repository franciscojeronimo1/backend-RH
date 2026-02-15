"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateTimeRecordService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const enums_1 = require("../../../generated/prisma/enums");
const dateUtils_1 = require("../../utils/dateUtils");
class ValidateTimeRecordService {
    async canStart(userId, date) {
        const startOfDay = (0, dateUtils_1.getStartOfDay)(date);
        const endOfDay = (0, dateUtils_1.getEndOfDay)(date);
        const lastRecord = await prismaClient_1.prismaClient.timeRecord.findFirst({
            where: {
                userId,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });
        if (!lastRecord || lastRecord.type === enums_1.TimeRecordType.STOP) {
            return true;
        }
        return false;
    }
    async canStop(userId, date) {
        const startOfDay = (0, dateUtils_1.getStartOfDay)(date);
        const endOfDay = (0, dateUtils_1.getEndOfDay)(date);
        const lastRecord = await prismaClient_1.prismaClient.timeRecord.findFirst({
            where: {
                userId,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });
        if (lastRecord && lastRecord.type === enums_1.TimeRecordType.START) {
            return true;
        }
        return false;
    }
}
exports.ValidateTimeRecordService = ValidateTimeRecordService;
//# sourceMappingURL=ValidateTimeRecordService.js.map