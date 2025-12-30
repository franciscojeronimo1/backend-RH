import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

class CreateStockEntryService {
    async execute(
        organizationId: string,
        productId: string,
        userId: string,
        quantity: number,
        unitPrice: number,
        supplierName?: string,
        supplierDoc?: string,
        invoiceNumber?: string,
        notes?: string
    ) {
        // Verificar se produto existe e pertence à organização
        const product = await prismaClient.product.findFirst({
            where: {
                id: productId,
                organizationId,
            },
        });

        if (!product) {
            throw new Error('Produto não encontrado');
        }

        const totalPrice = quantity * unitPrice;

        // Criar entrada
        const entry = await prismaClient.stockEntry.create({
            data: {
                organizationId,
                productId,
                userId,
                quantity,
                unitPrice: new Decimal(unitPrice),
                totalPrice: new Decimal(totalPrice),
                supplierName,
                supplierDoc,
                invoiceNumber,
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

        // Calcular novo custo médio
        const currentStock = product.currentStock;
        const currentAverageCost = product.averageCost ? Number(product.averageCost) : 0;
        
        let newAverageCost: typeof Decimal;
        if (currentStock === 0) {
            newAverageCost = new Decimal(unitPrice);
        } else {
            const totalCurrentValue = currentStock * currentAverageCost;
            const newValue = quantity * unitPrice;
            const totalNewStock = currentStock + quantity;
            newAverageCost = new Decimal((totalCurrentValue + newValue) / totalNewStock);
        }

        await prismaClient.product.update({
            where: { id: productId },
            data: {
                currentStock: currentStock + quantity,
                averageCost: newAverageCost,
                costPrice: new Decimal(unitPrice),
            },
        });

        return entry;
    }
}

export { CreateStockEntryService };

