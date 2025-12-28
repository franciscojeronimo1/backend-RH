import { prismaClient } from '../../config/prismaClient';
import { CalculateTotalService } from './CalculateTotalService';

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

        // Definir data (hoje se não fornecida)
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

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

export { ListTimeRecordsService };

