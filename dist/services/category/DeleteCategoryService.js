"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteCategoryService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class DeleteCategoryService {
    async execute(id, organizationId) {
        const category = await prismaClient_1.prismaClient.category.findFirst({
            where: { id, organizationId },
        });
        if (!category) {
            throw new Error('Categoria não encontrada');
        }
        await prismaClient_1.prismaClient.category.delete({
            where: { id },
        });
        return { message: 'Categoria excluída com sucesso' };
    }
}
exports.DeleteCategoryService = DeleteCategoryService;
//# sourceMappingURL=DeleteCategoryService.js.map