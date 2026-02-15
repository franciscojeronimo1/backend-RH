"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListProductsService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class ListProductsService {
    async execute(organizationId, category, includeInactive = false) {
        const where = {
            organizationId,
        };
        if (category) {
            where.category = category;
        }
        if (!includeInactive) {
            where.active = true;
        }
        const products = await prismaClient_1.prismaClient.product.findMany({
            where,
            orderBy: {
                name: 'asc',
            },
        });
        return products;
    }
}
exports.ListProductsService = ListProductsService;
//# sourceMappingURL=ListProductsService.js.map