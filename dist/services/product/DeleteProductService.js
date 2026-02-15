"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteProductService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class DeleteProductService {
    async execute(id, organizationId) {
        const product = await prismaClient_1.prismaClient.product.findFirst({
            where: {
                id,
                organizationId,
            },
        });
        if (!product) {
            throw new Error('Produto não encontrado');
        }
        const hasEntries = await prismaClient_1.prismaClient.stockEntry.findFirst({
            where: { productId: id },
        });
        const hasExits = await prismaClient_1.prismaClient.stockExit.findFirst({
            where: { productId: id },
        });
        if (hasEntries || hasExits) {
            return await prismaClient_1.prismaClient.product.update({
                where: { id },
                data: { active: false },
            });
        }
        await prismaClient_1.prismaClient.product.delete({
            where: { id },
        });
        return { message: 'Produto deletado com sucesso' };
    }
}
exports.DeleteProductService = DeleteProductService;
//# sourceMappingURL=DeleteProductService.js.map