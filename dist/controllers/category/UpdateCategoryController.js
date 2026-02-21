"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCategoryController = void 0;
const UpdateCategoryService_1 = require("../../services/category/UpdateCategoryService");
class UpdateCategoryController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const { name } = req.body;
        const updateCategoryService = new UpdateCategoryService_1.UpdateCategoryService();
        const result = await updateCategoryService.execute(id, req.user.organizationId, name);
        return res.json(result);
    }
}
exports.UpdateCategoryController = UpdateCategoryController;
//# sourceMappingURL=UpdateCategoryController.js.map