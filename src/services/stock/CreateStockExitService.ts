import { prismaClient } from '../../config/prismaClient';

class CreateStockExitService {
    async execute(
        organizationId: string,
        productId: string,
        userId: string,
        quantity: number,
        projectName?: string,
        clientName?: string,
        serviceType?: string,
        notes?: string
    ) {
        const product = await prismaClient.product.findFirst({
            where: {
                id: productId,
                organizationId,
            },
        });

        if (!product) {
            throw new Error('Produto não encontrado');
        }
        if (product.currentStock < quantity) {
            throw new Error(
                `Estoque insuficiente. Disponível: ${product.currentStock}, Solicitado: ${quantity}`
            );
        }

        const exit = await prismaClient.stockExit.create({
            data: {
                organizationId,
                productId,
                userId,
                quantity,
                projectName,
                clientName,
                serviceType,
                notes,
            },
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
        await prismaClient.product.update({
            where: { id: productId },
            data: {
                currentStock: product.currentStock - quantity,
            },
        });

        return exit;
    }
}

export { CreateStockExitService };


