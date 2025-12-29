import { prismaClient } from '../../config/prismaClient';
import { TimeRecordType } from '../../../generated/prisma/enums';
import { getStartOfDay, getEndOfDay } from '../../utils/dateUtils';

class ValidateTimeRecordService {

    async canStart(userId: string, date: Date): Promise<boolean> {
        const startOfDay = getStartOfDay(date);
        const endOfDay = getEndOfDay(date);

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
        const startOfDay = getStartOfDay(date);
        const endOfDay = getEndOfDay(date);

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

