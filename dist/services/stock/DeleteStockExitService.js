"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteStockExitService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class DeleteStockExitService {
    async execute(id, organizationId) {
        await prismaClient_1.prismaClient.$transaction(async (tx) => {
            const exit = await tx.stockExit.findFirst({
                where: { id, organizationId },
                include: {
                    product: {
                        select: {
                            id: true,
                            currentStock: true,
                        },
                    },
                },
            });
            if (!exit) {
                throw new Error('Saída não encontrada');
            }
            await tx.product.update({
                where: { id: exit.productId },
                data: {
                    currentStock: exit.product.currentStock + exit.quantity,
                },
            });
            await tx.stockExit.delete({ where: { id } });
        });
        return { message: 'Saída excluída com sucesso' };
    }
}
exports.DeleteStockExitService = DeleteStockExitService;
//# sourceMappingURL=DeleteStockExitService.js.map