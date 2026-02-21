"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCategoriesService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class ListCategoriesService {
    async execute(organizationId) {
        const categories = await prismaClient_1.prismaClient.category.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: 'asc' },
        });
        return { categories };
    }
}
exports.ListCategoriesService = ListCategoriesService;
//# sourceMappingURL=ListCategoriesService.js.map