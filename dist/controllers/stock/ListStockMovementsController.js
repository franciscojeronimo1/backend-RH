"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListStockMovementsController = void 0;
const ListStockMovementsService_1 = require("../../services/stock/ListStockMovementsService");
class ListStockMovementsController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { dateFrom, dateTo, productId, supplier, client, type, page, limit } = req.query;
        const listStockMovementsService = new ListStockMovementsService_1.ListStockMovementsService();
        const result = await listStockMovementsService.execute(req.user.organizationId, {
            dateFrom: dateFrom,
            dateTo: dateTo,
            productId: productId,
            supplier: supplier,
            client: client,
            type: type === 'entry' || type === 'exit' ? type : undefined,
            page: page ? parseInt(String(page), 10) : undefined,
            limit: limit ? parseInt(String(limit), 10) : undefined,
        });
        return res.json(result);
    }
}
exports.ListStockMovementsController = ListStockMovementsController;
//# sourceMappingURL=ListStockMovementsController.js.map