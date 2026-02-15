"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListProductsController = void 0;
const ListProductsService_1 = require("../../services/product/ListProductsService");
class ListProductsController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { category, includeInactive } = req.query;
        const listProductsService = new ListProductsService_1.ListProductsService();
        const products = await listProductsService.execute(req.user.organizationId, category, includeInactive === 'true');
        return res.json({ products });
    }
}
exports.ListProductsController = ListProductsController;
//# sourceMappingURL=ListProductsController.js.map