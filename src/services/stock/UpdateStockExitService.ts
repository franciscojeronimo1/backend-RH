import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

interface UpdateStockExitData {
    productId?: string;
    quantity?: number;
    unitPrice?: number | null;
    projectName?: string | null;
    clientName?: string | null;
    serviceType?: string | null;
    notes?: string | null;
}

class UpdateStockExitService {
    async execute(id: string, organizationId: string, data: UpdateStockExitData) {
        const exit = await prismaClient.stockExit.findFirst({
            where: { id, organizationId },
            include: {
                product: {
                    select: {
                        id: true,
                        currentStock: true,
                        salePrice: true,
                    },
                },
            },
        });

        if (!exit) {
            throw new Error('Saída não encontrada');
        }

        const productId = data.productId ?? exit.productId;
        const quantity = data.quantity ?? exit.quantity;

        const needsStockAdjustment =
            quantity !== exit.quantity || productId !== exit.productId;

        if (needsStockAdjustment) {
            const oldProduct = exit.product;

            // Reverter: devolver quantidade ao produto original
            await prismaClient.product.update({
                where: { id: oldProduct.id },
                data: {
                    currentStock: oldProduct.currentStock + exit.quantity,
                },
            });

            // Aplicar nova saída (no mesmo ou outro produto)
            const newProduct = await prismaClient.product.findFirst({
                where: { id: productId, organizationId },
            });

            if (!newProduct) {
                throw new Error('Produto não encontrado');
            }

            // Após o revert, o produto já tem a quantidade de volta (se for o mesmo produto)
            const availableStock = newProduct.currentStock;

            if (availableStock < quantity) {
                throw new Error(
                    `Estoque insuficiente. Disponível: ${availableStock}, Solicitado: ${quantity}`
                );
            }

            await prismaClient.product.update({
                where: { id: productId },
                data: {
                    currentStock: availableStock - quantity,
                },
            });
        }

        let unitPrice: number | undefined;
        if (data.unitPrice !== undefined && data.unitPrice !== null) {
            unitPrice = data.unitPrice;
        } else if (exit.unitPrice) {
            unitPrice = Number(exit.unitPrice);
        } else {
            const productForPrice = await prismaClient.product.findFirst({
                where: { id: productId, organizationId },
            });
            unitPrice = productForPrice?.salePrice
                ? Number(productForPrice.salePrice)
                : undefined;
        }

        const updateData: Record<string, unknown> = {
            productId,
            quantity,
        };

        if (unitPrice !== undefined && unitPrice !== null) {
            updateData.unitPrice = new Decimal(unitPrice);
            updateData.totalPrice = new Decimal(quantity * unitPrice);
        } else {
            updateData.unitPrice = exit.unitPrice;
            updateData.totalPrice = exit.totalPrice;
        }

        if (data.projectName !== undefined) updateData.projectName = data.projectName;
        if (data.clientName !== undefined) updateData.clientName = data.clientName;
        if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const updated = await prismaClient.stockExit.update({
            where: { id },
            data: updateData,
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

        return updated;
    }
}

export { UpdateStockExitService };
