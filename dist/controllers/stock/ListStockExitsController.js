"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListStockExitsController = void 0;
const ListStockExitsService_1 = require("../../services/stock/ListStockExitsService");
class ListStockExitsController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { productId, date } = req.query;
        const listStockExitsService = new ListStockExitsService_1.ListStockExitsService();
        const exits = await listStockExitsService.execute(req.user.organizationId, productId, date);
        return res.json({ exits });
    }
}
exports.ListStockExitsController = ListStockExitsController;
//# sourceMappingURL=ListStockExitsController.js.map