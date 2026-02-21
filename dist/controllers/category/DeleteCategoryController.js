"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteCategoryController = void 0;
const DeleteCategoryService_1 = require("../../services/category/DeleteCategoryService");
class DeleteCategoryController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const deleteCategoryService = new DeleteCategoryService_1.DeleteCategoryService();
        const result = await deleteCategoryService.execute(id, req.user.organizationId);
        return res.json(result);
    }
}
exports.DeleteCategoryController = DeleteCategoryController;
//# sourceMappingURL=DeleteCategoryController.js.map