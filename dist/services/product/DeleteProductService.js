"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteProductService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class DeleteProductService {
    async execute(id, organizationId) {
        await prismaClient_1.prismaClient.$transaction(async (tx) => {
            const product = await tx.product.findFirst({
                where: { id, organizationId },
                select: { id: true },
            });
            if (!product) {
                throw new Error('Produto não encontrado');
            }
            await tx.stockEntry.deleteMany({
                where: { productId: id, organizationId },
            });
            await tx.stockExit.deleteMany({
                where: { productId: id, organizationId },
            });
            await tx.product.deleteMany({
                where: { id, organizationId },
            });
        });
        return { message: 'Produto excluído com sucesso' };
    }
}
exports.DeleteProductService = DeleteProductService;
//# sourceMappingURL=DeleteProductService.js.map