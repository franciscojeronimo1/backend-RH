import { prismaClient } from '../../config/prismaClient';

class DeleteProductService {
    async execute(id: string, organizationId: string) {
        await prismaClient.$transaction(async (tx) => {
            const product = await tx.product.findFirst({
                where: { id, organizationId },
                select: { id: true },
            });

            if (!product) {
                throw new Error('Produto não encontrado');
            }

            await tx.stockEntry.deleteMany({
                where: { productId: id, organizationId },
            });

            await tx.stockExit.deleteMany({
                where: { productId: id, organizationId },
            });

            await tx.product.deleteMany({
                where: { id, organizationId },
            });
        });

        return { message: 'Produto excluído com sucesso' };
    }
}

export { DeleteProductService };
