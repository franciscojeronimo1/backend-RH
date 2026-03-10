"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStockEntryService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;
class UpdateStockEntryService {
    async execute(id, organizationId, data) {
        const entry = await prismaClient_1.prismaClient.stockEntry.findFirst({
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
        const needsStockAdjustment = quantity !== entry.quantity ||
            unitPrice !== Number(entry.unitPrice) ||
            productId !== entry.productId;
        if (needsStockAdjustment) {
            const oldProduct = entry.product;
            const oldStock = oldProduct.currentStock - entry.quantity;
            const oldTotalValue = oldProduct.currentStock * Number(oldProduct.averageCost ?? 0) -
                entry.quantity * Number(entry.unitPrice);
            const oldAvgCost = oldStock > 0 ? oldTotalValue / oldStock : 0;
            await prismaClient_1.prismaClient.product.update({
                where: { id: oldProduct.id },
                data: {
                    currentStock: oldStock,
                    averageCost: new Decimal(oldAvgCost),
                },
            });
            const newProduct = await prismaClient_1.prismaClient.product.findFirst({
                where: { id: productId, organizationId },
            });
            if (!newProduct) {
                throw new Error('Produto não encontrado');
            }
            const currentStock = newProduct.currentStock;
            const currentAverageCost = Number(newProduct.averageCost ?? 0) || 0;
            let newAverageCost;
            if (currentStock === 0) {
                newAverageCost = new Decimal(unitPrice);
            }
            else {
                const totalCurrentValue = currentStock * currentAverageCost;
                const newValue = quantity * unitPrice;
                const totalNewStock = currentStock + quantity;
                newAverageCost = new Decimal((totalCurrentValue + newValue) / totalNewStock);
            }
            await prismaClient_1.prismaClient.product.update({
                where: { id: productId },
                data: {
                    currentStock: currentStock + quantity,
                    averageCost: newAverageCost,
                    costPrice: new Decimal(unitPrice),
                },
            });
        }
        const totalPrice = quantity * unitPrice;
        const updateData = {
            productId,
            quantity,
            unitPrice: new Decimal(unitPrice),
            totalPrice: new Decimal(totalPrice),
        };
        if (data.supplierName !== undefined)
            updateData.supplierName = data.supplierName;
        if (data.supplierDoc !== undefined)
            updateData.supplierDoc = data.supplierDoc;
        if (data.invoiceNumber !== undefined)
            updateData.invoiceNumber = data.invoiceNumber;
        if (data.notes !== undefined)
            updateData.notes = data.notes;
        const updated = await prismaClient_1.prismaClient.stockEntry.update({
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
exports.UpdateStockEntryService = UpdateStockEntryService;
//# sourceMappingURL=UpdateStockEntryService.js.map