"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteStockEntryService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;
class DeleteStockEntryService {
    async execute(id, organizationId) {
        await prismaClient_1.prismaClient.$transaction(async (tx) => {
            const entry = await tx.stockEntry.findFirst({
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
            const product = entry.product;
            if (product.currentStock < entry.quantity) {
                throw new Error('Validação: estoque atual é menor que a quantidade desta entrada; não é possível excluir com segurança.');
            }
            const oldStock = product.currentStock - entry.quantity;
            const oldTotalValue = product.currentStock * Number(product.averageCost ?? 0) -
                entry.quantity * Number(entry.unitPrice);
            const oldAvgCost = oldStock > 0 ? oldTotalValue / oldStock : 0;
            await tx.product.update({
                where: { id: product.id },
                data: {
                    currentStock: oldStock,
                    averageCost: new Decimal(oldAvgCost),
                },
            });
            await tx.stockEntry.delete({ where: { id } });
        });
        return { message: 'Entrada excluída com sucesso' };
    }
}
exports.DeleteStockEntryService = DeleteStockEntryService;
//# sourceMappingURL=DeleteStockEntryService.js.map