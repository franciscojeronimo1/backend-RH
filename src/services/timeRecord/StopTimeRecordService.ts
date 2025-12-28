import { prismaClient } from '../../config/prismaClient';
import { TimeRecordType } from '../../../generated/prisma/enums';
import { ValidateTimeRecordService } from './ValidateTimeRecordService';
import { CalculateTotalService } from './CalculateTotalService';

class StopTimeRecordService {
    async execute(userId: string) {
        const validateService = new ValidateTimeRecordService();
        const calculateService = new CalculateTotalService();
        const now = new Date();

        const canStop = await validateService.canStop(userId, now);
        if (!canStop) {
            throw new Error('Você precisa iniciar o trabalho antes de parar.');
        }

        const timeRecord = await prismaClient.timeRecord.create({
            data: {
                userId,
                type: TimeRecordType.STOP,
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

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const dayRecords = await prismaClient.timeRecord.findMany({
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

export { StopTimeRecordService };

