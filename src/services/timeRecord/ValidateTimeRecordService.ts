import { prismaClient } from '../../config/prismaClient';
import { TimeRecordType } from '../../../generated/prisma/enums';

class ValidateTimeRecordService {

    async canStart(userId: string, date: Date): Promise<boolean> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const lastRecord = await prismaClient.timeRecord.findFirst({
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

        if (!lastRecord || lastRecord.type === TimeRecordType.STOP) {
            return true;
        }

        return false;
    }

    async canStop(userId: string, date: Date): Promise<boolean> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const lastRecord = await prismaClient.timeRecord.findFirst({
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


        if (lastRecord && lastRecord.type === TimeRecordType.START) {
            return true;
        }

        return false;
    }
}

export { ValidateTimeRecordService };

