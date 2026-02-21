"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCategoryService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class CreateCategoryService {
    async execute(organizationId, name) {
        const trimmedName = name.trim();
        const existing = await prismaClient_1.prismaClient.category.findFirst({
            where: { organizationId, name: trimmedName },
            select: { id: true, name: true },
        });
        if (existing) {
            return { category: existing };
        }
        const category = await prismaClient_1.prismaClient.category.create({
            data: {
                organizationId,
                name: trimmedName,
            },
            select: {
                id: true,
                name: true,
            },
        });
        return { category };
    }
}
exports.CreateCategoryService = CreateCategoryService;
//# sourceMappingURL=CreateCategoryService.js.map