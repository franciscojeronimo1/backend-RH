"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStockExitService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;
class UpdateStockExitService {
    async execute(id, organizationId, data) {
        const exit = await prismaClient_1.prismaClient.stockExit.findFirst({
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
        const needsStockAdjustment = quantity !== exit.quantity || productId !== exit.productId;
        if (needsStockAdjustment) {
            const oldProduct = exit.product;
            await prismaClient_1.prismaClient.product.update({
                where: { id: oldProduct.id },
                data: {
                    currentStock: oldProduct.currentStock + exit.quantity,
                },
            });
            const newProduct = await prismaClient_1.prismaClient.product.findFirst({
                where: { id: productId, organizationId },
            });
            if (!newProduct) {
                throw new Error('Produto não encontrado');
            }
            const availableStock = newProduct.currentStock;
            if (availableStock < quantity) {
                throw new Error(`Estoque insuficiente. Disponível: ${availableStock}, Solicitado: ${quantity}`);
            }
            await prismaClient_1.prismaClient.product.update({
                where: { id: productId },
                data: {
                    currentStock: availableStock - quantity,
                },
            });
        }
        let unitPrice;
        if (data.unitPrice !== undefined && data.unitPrice !== null) {
            unitPrice = data.unitPrice;
        }
        else if (exit.unitPrice) {
            unitPrice = Number(exit.unitPrice);
        }
        else {
            const productForPrice = await prismaClient_1.prismaClient.product.findFirst({
                where: { id: productId, organizationId },
            });
            unitPrice = productForPrice?.salePrice
                ? Number(productForPrice.salePrice)
                : undefined;
        }
        const updateData = {
            productId,
            quantity,
        };
        if (unitPrice !== undefined && unitPrice !== null) {
            updateData.unitPrice = new Decimal(unitPrice);
            updateData.totalPrice = new Decimal(quantity * unitPrice);
        }
        else {
            updateData.unitPrice = exit.unitPrice;
            updateData.totalPrice = exit.totalPrice;
        }
        if (data.projectName !== undefined)
            updateData.projectName = data.projectName;
        if (data.clientName !== undefined)
            updateData.clientName = data.clientName;
        if (data.serviceType !== undefined)
            updateData.serviceType = data.serviceType;
        if (data.notes !== undefined)
            updateData.notes = data.notes;
        const updated = await prismaClient_1.prismaClient.stockExit.update({
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
exports.UpdateStockExitService = UpdateStockExitService;
//# sourceMappingURL=UpdateStockExitService.js.map