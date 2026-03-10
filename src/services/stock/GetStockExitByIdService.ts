import { prismaClient } from '../../config/prismaClient';

class GetStockExitByIdService {
    async execute(id: string, organizationId: string) {
        const exit = await prismaClient.stockExit.findFirst({
            where: { id, organizationId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        currentStock: true,
                        salePrice: true,
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

        if (!exit) {
            throw new Error('Saída não encontrada');
        }

        return exit;
    }
}

export { GetStockExitByIdService };
