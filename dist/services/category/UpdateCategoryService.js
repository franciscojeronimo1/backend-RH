"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCategoryService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class UpdateCategoryService {
    async execute(id, organizationId, name) {
        const category = await prismaClient_1.prismaClient.category.findFirst({
            where: { id, organizationId },
        });
        if (!category) {
            throw new Error('Categoria não encontrada');
        }
        const trimmedName = name.trim();
        const existingWithName = await prismaClient_1.prismaClient.category.findFirst({
            where: {
                organizationId,
                name: trimmedName,
                id: { not: id },
            },
        });
        if (existingWithName) {
            throw new Error('Já existe uma categoria com este nome');
        }
        const updated = await prismaClient_1.prismaClient.category.update({
            where: { id },
            data: { name: trimmedName },
            select: { id: true, name: true },
        });
        return { category: updated };
    }
}
exports.UpdateCategoryService = UpdateCategoryService;
//# sourceMappingURL=UpdateCategoryService.js.map