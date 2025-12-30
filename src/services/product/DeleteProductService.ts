import { prismaClient } from '../../config/prismaClient';

class DeleteProductService {
    async execute(id: string, organizationId: string) {
        // Verificar se produto existe e pertence à organização
        const product = await prismaClient.product.findFirst({
            where: {
                id,
                organizationId,
            },
        });

        if (!product) {
            throw new Error('Produto não encontrado');
        }

        // Verificar se tem movimentações
        const hasEntries = await prismaClient.stockEntry.findFirst({
            where: { productId: id },
        });

        const hasExits = await prismaClient.stockExit.findFirst({
            where: { productId: id },
        });

        if (hasEntries || hasExits) {
            // Não deletar, apenas desativar
            return await prismaClient.product.update({
                where: { id },
                data: { active: false },
            });
        }

        // Deletar se não tem movimentações
        await prismaClient.product.delete({
            where: { id },
        });

        return { message: 'Produto deletado com sucesso' };
    }
}

export { DeleteProductService };


