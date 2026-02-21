"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListProductsService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
class ListProductsService {
    async execute(organizationId, category, includeInactive = false, paginationParams) {
        const where = {
            organizationId,
        };
        if (category) {
            where.category = category;
        }
        if (!includeInactive) {
            where.active = true;
        }
        const page = Math.max(1, paginationParams?.page ?? DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, paginationParams?.limit ?? DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            prismaClient_1.prismaClient.product.findMany({
                where,
                orderBy: {
                    name: 'asc',
                },
                skip,
                take: limit,
            }),
            prismaClient_1.prismaClient.product.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }
}
exports.ListProductsService = ListProductsService;
//# sourceMappingURL=ListProductsService.js.map