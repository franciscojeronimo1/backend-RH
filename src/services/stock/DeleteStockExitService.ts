import { prismaClient } from '../../config/prismaClient';

class DeleteStockExitService {
    async execute(id: string, organizationId: string) {
        await prismaClient.$transaction(async (tx) => {
            const exit = await tx.stockExit.findFirst({
                where: { id, organizationId },
                include: {
                    product: {
                        select: {
                            id: true,
                            currentStock: true,
                        },
                    },
                },
            });

            if (!exit) {
                throw new Error('Saída não encontrada');
            }

            await tx.product.update({
                where: { id: exit.productId },
                data: {
                    currentStock: exit.product.currentStock + exit.quantity,
                },
            });

            await tx.stockExit.delete({ where: { id } });
        });

        return { message: 'Saída excluída com sucesso' };
    }
}

export { DeleteStockExitService };
