import { prismaClient } from '../../config/prismaClient';

class GetStockEntryByIdService {
    async execute(id: string, organizationId: string) {
        const entry = await prismaClient.stockEntry.findFirst({
            where: { id, organizationId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        currentStock: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!entry) {
            throw new Error('Entrada não encontrada');
        }

        return entry;
    }
}

export { GetStockEntryByIdService };
