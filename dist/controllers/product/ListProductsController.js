"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListProductsController = void 0;
const ListProductsService_1 = require("../../services/product/ListProductsService");
class ListProductsController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { category, includeInactive, page, limit } = req.query;
        const listProductsService = new ListProductsService_1.ListProductsService();
        const result = await listProductsService.execute(req.user.organizationId, category, includeInactive === 'true', {
            page: page ? parseInt(String(page), 10) : undefined,
            limit: limit ? parseInt(String(limit), 10) : undefined,
        });
        return res.json(result);
    }
}
exports.ListProductsController = ListProductsController;
//# sourceMappingURL=ListProductsController.js.map