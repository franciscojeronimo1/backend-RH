import { prismaClient } from '../../config/prismaClient';
import { CalculateTotalService } from './CalculateTotalService';
import { getStartOfDay, getEndOfDay, getCurrentLocalDate, parseLocalDate, isValidDateString } from '../../utils/dateUtils';

class ListTimeRecordsService {
    async execute(userId: string, targetUserId: string | null, date?: string) {
        const queryUserId = targetUserId || userId;

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

        // Validar formato de data se fornecida
        if (date && !isValidDateString(date)) {
            throw new Error('Data inválida. Use o formato YYYY-MM-DD');
        }

        const targetDate = date ? parseLocalDate(date) : getCurrentLocalDate();
        const startOfDay = getStartOfDay(targetDate);
        const endOfDay = getEndOfDay(targetDate);

        const records = await prismaClient.timeRecord.findMany({
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

        const calculateService = new CalculateTotalService();
        const summary = calculateService.calculateDayTotal(records);

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

