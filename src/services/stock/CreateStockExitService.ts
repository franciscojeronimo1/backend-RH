import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

class CreateStockExitService {
    async execute(
        organizationId: string,
        productId: string,
        userId: string,
        quantity: number,
        projectName?: string,
        clientName?: string,
        serviceType?: string,
        notes?: string,
        unitPrice?: number
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

        const exitData: {
            organizationId: string;
            productId: string;
            userId: string;
            quantity: number;
            projectName?: string;
            clientName?: string;
            serviceType?: string;
            notes?: string;
            unitPrice?: typeof Decimal;
            totalPrice?: typeof Decimal;
        } = {
            organizationId,
            productId,
            userId,
            quantity,
            projectName,
            clientName,
            serviceType,
            notes,
        };

        if (unitPrice !== undefined && unitPrice !== null) {
            const totalPrice = quantity * unitPrice;
            exitData.unitPrice = new Decimal(unitPrice);
            exitData.totalPrice = new Decimal(totalPrice);
        }

        const exit = await prismaClient.stockExit.create({
            data: exitData,
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


