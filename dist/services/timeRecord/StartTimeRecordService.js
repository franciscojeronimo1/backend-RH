"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartTimeRecordService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const enums_1 = require("../../../generated/prisma/enums");
const ValidateTimeRecordService_1 = require("./ValidateTimeRecordService");
const dateUtils_1 = require("../../utils/dateUtils");
class StartTimeRecordService {
    async execute(userId) {
        const validateService = new ValidateTimeRecordService_1.ValidateTimeRecordService();
        const now = (0, dateUtils_1.getCurrentLocalDate)();
        const canStart = await validateService.canStart(userId, now);
        if (!canStart) {
            throw new Error('Você já está trabalhando. Pare o trabalho antes de iniciar novamente.');
        }
        const timeRecord = await prismaClient_1.prismaClient.timeRecord.create({
            data: {
                userId,
                type: enums_1.TimeRecordType.START,
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
        return {
            id: timeRecord.id,
            type: timeRecord.type,
            timestamp: timeRecord.timestamp,
            user: timeRecord.user,
            message: 'Trabalho iniciado com sucesso',
        };
    }
}
exports.StartTimeRecordService = StartTimeRecordService;
//# sourceMappingURL=StartTimeRecordService.js.map