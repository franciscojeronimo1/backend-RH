"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListStockEntriesController = void 0;
const ListStockEntriesService_1 = require("../../services/stock/ListStockEntriesService");
class ListStockEntriesController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { productId, date } = req.query;
        const listStockEntriesService = new ListStockEntriesService_1.ListStockEntriesService();
        const entries = await listStockEntriesService.execute(req.user.organizationId, productId, date);
        return res.json({ entries });
    }
}
exports.ListStockEntriesController = ListStockEntriesController;
//# sourceMappingURL=ListStockEntriesController.js.map