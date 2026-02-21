"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCategoriesController = void 0;
const ListCategoriesService_1 = require("../../services/category/ListCategoriesService");
class ListCategoriesController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const listCategoriesService = new ListCategoriesService_1.ListCategoriesService();
        const result = await listCategoriesService.execute(req.user.organizationId);
        return res.json(result);
    }
}
exports.ListCategoriesController = ListCategoriesController;
//# sourceMappingURL=ListCategoriesController.js.map