import { prismaClient } from '../../config/prismaClient';
import { computeBookletTotals } from './bookletTotals';

class ListBookletsService {
    async execute(organizationId: string, clientId?: string) {
        const where: { organizationId: string; clientId?: string } = { organizationId };
        if (clientId) where.clientId = clientId;

        const booklets = await prismaClient.booklet.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        cpf: true,
                        phone: true,
                    },
                },
                parcels: {
                    orderBy: { number: 'asc' },
                    select: {
                        id: true,
                        number: true,
                        dueDate: true,
                        amount: true,
                        status: true,
                        paidAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            booklets: booklets.map((booklet) => ({
                ...booklet,
                ...computeBookletTotals(booklet.parcels),
            })),
        };
    }
}

export { ListBookletsService };
