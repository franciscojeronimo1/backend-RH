import { prismaClient } from '../../config/prismaClient';
import { TimeRecordType } from '../../../generated/prisma/enums';
import { ValidateTimeRecordService } from './ValidateTimeRecordService';

class StartTimeRecordService {
    async execute(userId: string) {
        const validateService = new ValidateTimeRecordService();
        const now = new Date();

        const canStart = await validateService.canStart(userId, now);
        if (!canStart) {
            throw new Error('Você já está trabalhando. Pare o trabalho antes de iniciar novamente.');
        }

        const timeRecord = await prismaClient.timeRecord.create({
            data: {
                userId,
                type: TimeRecordType.START,
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

export { StartTimeRecordService };

