"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStockEntryService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;
class CreateStockEntryService {
    async execute(organizationId, productId, userId, quantity, unitPrice, supplierName, supplierDoc, invoiceNumber, notes) {
        const product = await prismaClient_1.prismaClient.product.findFirst({
            where: {
                id: productId,
                organizationId,
            },
        });
        if (!product) {
            throw new Error('Produto não encontrado');
        }
        const totalPrice = quantity * unitPrice;
        const entry = await prismaClient_1.prismaClient.stockEntry.create({
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
        const currentStock = product.currentStock;
        const currentAverageCost = product.averageCost ? Number(product.averageCost) : 0;
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
        return entry;
    }
}
exports.CreateStockEntryService = CreateStockEntryService;
//# sourceMappingURL=CreateStockEntryService.js.map