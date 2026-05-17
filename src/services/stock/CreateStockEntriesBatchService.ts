import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

type StockEntryItem = {
    productId: string;
    quantity: number;
    unitPrice: number;
};

type BatchMetadata = {
    supplierName?: string;
    supplierDoc?: string;
    invoiceNumber?: string;
    notes?: string;
};

type ProductStockState = {
    currentStock: number;
    averageCost: number | null;
};

const entryInclude = {
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
};

class CreateStockEntriesBatchService {
    async execute(
        organizationId: string,
        userId: string,
        items: StockEntryItem[],
        metadata: BatchMetadata = {}
    ) {
        return prismaClient.$transaction(async (tx) => {
            const productIds = [...new Set(items.map((item) => item.productId))];
            const products = await tx.product.findMany({
                where: {
                    id: { in: productIds },
                    organizationId,
                },
            });
            const productMap = new Map(products.map((p) => [p.id, p]));
            const stockState = new Map<string, ProductStockState>();

            for (const [index, item] of items.entries()) {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new Error(`Produto não encontrado (item ${index + 1})`);
                }
            }

            for (const product of products) {
                stockState.set(product.id, {
                    currentStock: product.currentStock,
                    averageCost: product.averageCost ? Number(product.averageCost) : null,
                });
            }

            const entries = [];

            for (const item of items) {
                const state = stockState.get(item.productId)!;
                const totalPrice = item.quantity * item.unitPrice;

                const entry = await tx.stockEntry.create({
                    data: {
                        organizationId,
                        productId: item.productId,
                        userId,
                        quantity: item.quantity,
                        unitPrice: new Decimal(item.unitPrice),
                        totalPrice: new Decimal(totalPrice),
                        supplierName: metadata.supplierName,
                        supplierDoc: metadata.supplierDoc,
                        invoiceNumber: metadata.invoiceNumber,
                        notes: metadata.notes,
                    },
                    include: entryInclude,
                });

                const currentStock = state.currentStock;
                const currentAverageCost = state.averageCost ?? 0;

                let newAverageCost: typeof Decimal;
                if (currentStock === 0) {
                    newAverageCost = new Decimal(item.unitPrice);
                } else {
                    const totalCurrentValue = currentStock * currentAverageCost;
                    const newValue = item.quantity * item.unitPrice;
                    const totalNewStock = currentStock + item.quantity;
                    newAverageCost = new Decimal(
                        (totalCurrentValue + newValue) / totalNewStock
                    );
                }

                const newStock = currentStock + item.quantity;
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        currentStock: newStock,
                        averageCost: newAverageCost,
                        costPrice: new Decimal(item.unitPrice),
                    },
                });

                stockState.set(item.productId, {
                    currentStock: newStock,
                    averageCost: Number(newAverageCost),
                });

                entries.push(entry);
            }

            return entries;
        });
    }
}

export { CreateStockEntriesBatchService };
