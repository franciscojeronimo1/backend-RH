import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

interface UpdateStockEntryData {
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    supplierName?: string | null;
    supplierDoc?: string | null;
    invoiceNumber?: string | null;
    notes?: string | null;
}

class UpdateStockEntryService {
    async execute(id: string, organizationId: string, data: UpdateStockEntryData) {
        const entry = await prismaClient.stockEntry.findFirst({
            where: { id, organizationId },
            include: {
                product: {
                    select: {
                        id: true,
                        currentStock: true,
                        averageCost: true,
                    },
                },
            },
        });

        if (!entry) {
            throw new Error('Entrada não encontrada');
        }

        const productId = data.productId ?? entry.productId;
        const quantity = data.quantity ?? entry.quantity;
        const unitPrice = data.unitPrice ?? Number(entry.unitPrice);

        const needsStockAdjustment =
            quantity !== entry.quantity ||
            unitPrice !== Number(entry.unitPrice) ||
            productId !== entry.productId;

        if (needsStockAdjustment) {
            const oldProduct = entry.product;

            // Reverter efeito da entrada original no produto
            const oldStock = oldProduct.currentStock - entry.quantity;
            const oldTotalValue =
                oldProduct.currentStock * Number(oldProduct.averageCost ?? 0) -
                entry.quantity * Number(entry.unitPrice);
            const oldAvgCost = oldStock > 0 ? oldTotalValue / oldStock : 0;

            await prismaClient.product.update({
                where: { id: oldProduct.id },
                data: {
                    currentStock: oldStock,
                    averageCost: new Decimal(oldAvgCost),
                },
            });

            // Aplicar nova entrada (no mesmo ou outro produto)
            const newProduct = await prismaClient.product.findFirst({
                where: { id: productId, organizationId },
            });

            if (!newProduct) {
                throw new Error('Produto não encontrado');
            }

            const currentStock = newProduct.currentStock;
            const currentAverageCost = Number(newProduct.averageCost ?? 0) || 0;

            let newAverageCost: typeof Decimal;
            if (currentStock === 0) {
                newAverageCost = new Decimal(unitPrice);
            } else {
                const totalCurrentValue = currentStock * currentAverageCost;
                const newValue = quantity * unitPrice;
                const totalNewStock = currentStock + quantity;
                newAverageCost = new Decimal(
                    (totalCurrentValue + newValue) / totalNewStock
                );
            }

            await prismaClient.product.update({
                where: { id: productId },
                data: {
                    currentStock: currentStock + quantity,
                    averageCost: newAverageCost,
                    costPrice: new Decimal(unitPrice),
                },
            });
        }

        const totalPrice = quantity * unitPrice;

        const updateData: Record<string, unknown> = {
            productId,
            quantity,
            unitPrice: new Decimal(unitPrice),
            totalPrice: new Decimal(totalPrice),
        };

        if (data.supplierName !== undefined) updateData.supplierName = data.supplierName;
        if (data.supplierDoc !== undefined) updateData.supplierDoc = data.supplierDoc;
        if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const updated = await prismaClient.stockEntry.update({
            where: { id },
            data: updateData,
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

        return updated;
    }
}

export { UpdateStockEntryService };
