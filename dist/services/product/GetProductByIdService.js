"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductByIdService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class GetProductByIdService {
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
        return product;
    }
}
exports.GetProductByIdService = GetProductByIdService;
//# sourceMappingURL=GetProductByIdService.js.map