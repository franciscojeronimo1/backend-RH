"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateProductService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class CreateProductService {
    async execute(organizationId, name, code, sku, category, minStock = 0, unit = 'UN', costPrice) {
        const product = await prismaClient_1.prismaClient.product.create({
            data: {
                organizationId,
                name,
                code,
                sku,
                category,
                minStock,
                unit,
                costPrice: costPrice ? costPrice : null,
                averageCost: costPrice ? costPrice : null,
                currentStock: 0,
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return product;
    }
}
exports.CreateProductService = CreateProductService;
//# sourceMappingURL=CreateProductService.js.map