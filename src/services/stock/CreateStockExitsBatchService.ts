import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

type StockExitItem = {
    productId: string;
    quantity: number;
    unitPrice?: number;
};

type BatchMetadata = {
    projectName?: string;
    clientName?: string;
    serviceType?: string;
    notes?: string;
};

type ProductRecord = {
    id: string;
    name: string;
    currentStock: number;
    salePrice: { toString(): string } | null;
};

const exitInclude = {
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
};

class CreateStockExitsBatchService {
    async execute(
        organizationId: string,
        userId: string,
        items: StockExitItem[],
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
            const productMap = new Map<string, ProductRecord>(
                products.map((p) => [
                    p.id,
                    {
                        id: p.id,
                        name: p.name,
                        currentStock: p.currentStock,
                        salePrice: p.salePrice,
                    },
                ])
            );
            const stockState = new Map<string, number>();

            for (const [index, item] of items.entries()) {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new Error(`Produto não encontrado (item ${index + 1})`);
                }
                if (!stockState.has(item.productId)) {
                    stockState.set(item.productId, product.currentStock);
                }
            }

            const exits = [];

            for (const [index, item] of items.entries()) {
                const product = productMap.get(item.productId)!;
                const availableStock = stockState.get(item.productId)!;

                if (availableStock < item.quantity) {
                    throw new Error(
                        `Estoque insuficiente (item ${index + 1}). Disponível: ${availableStock}, Solicitado: ${item.quantity}`
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
                    productId: item.productId,
                    userId,
                    quantity: item.quantity,
                    projectName: metadata.projectName,
                    clientName: metadata.clientName,
                    serviceType: metadata.serviceType,
                    notes: metadata.notes,
                };

                const priceToUse =
                    item.unitPrice ??
                    (product.salePrice ? Number(product.salePrice) : undefined);
                if (priceToUse !== undefined && priceToUse !== null) {
                    exitData.unitPrice = new Decimal(priceToUse);
                    exitData.totalPrice = new Decimal(item.quantity * priceToUse);
                }

                const exit = await tx.stockExit.create({
                    data: exitData,
                    include: exitInclude,
                });

                const newStock = availableStock - item.quantity;
                await tx.product.update({
                    where: { id: item.productId },
                    data: { currentStock: newStock },
                });

                stockState.set(item.productId, newStock);
                product.currentStock = newStock;

                exits.push(exit);
            }

            return exits;
        });
    }
}

export { CreateStockExitsBatchService };
