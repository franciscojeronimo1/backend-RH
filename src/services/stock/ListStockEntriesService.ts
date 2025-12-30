import { prismaClient } from '../../config/prismaClient';
import { getStartOfDay, getEndOfDay, parseLocalDate, getCurrentLocalDate } from '../../utils/dateUtils';

class ListStockEntriesService {
    async execute(organizationId: string, productId?: string, date?: string) {
        const where: any = {
            organizationId,
        };

        if (productId) {
            where.productId = productId;
        }

        if (date) {
            const targetDate = parseLocalDate(date);
            const startOfDay = getStartOfDay(targetDate);
            const endOfDay = getEndOfDay(targetDate);
            
            where.createdAt = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }

        const entries = await prismaClient.stockEntry.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return entries;
    }
}

export { ListStockEntriesService };


