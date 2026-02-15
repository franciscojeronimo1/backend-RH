"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProductService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class UpdateProductService {
    async execute(id, organizationId, data) {
        const existingProduct = await prismaClient_1.prismaClient.product.findFirst({
            where: {
                id,
                organizationId,
            },
        });
        if (!existingProduct) {
            throw new Error('Produto não encontrado');
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.code !== undefined)
            updateData.code = data.code;
        if (data.sku !== undefined)
            updateData.sku = data.sku;
        if (data.category !== undefined)
            updateData.category = data.category;
        if (data.minStock !== undefined)
            updateData.minStock = data.minStock;
        if (data.unit !== undefined)
            updateData.unit = data.unit;
        if (data.costPrice !== undefined)
            updateData.costPrice = data.costPrice;
        if (data.active !== undefined)
            updateData.active = data.active;
        const product = await prismaClient_1.prismaClient.product.update({
            where: { id },
            data: updateData,
        });
        return product;
    }
}
exports.UpdateProductService = UpdateProductService;
//# sourceMappingURL=UpdateProductService.js.map