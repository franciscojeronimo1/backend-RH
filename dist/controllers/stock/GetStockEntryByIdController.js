"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetStockEntryByIdController = void 0;
const GetStockEntryByIdService_1 = require("../../services/stock/GetStockEntryByIdService");
class GetStockEntryByIdController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const getStockEntryByIdService = new GetStockEntryByIdService_1.GetStockEntryByIdService();
        const entry = await getStockEntryByIdService.execute(id, req.user.organizationId);
        return res.json({ entry });
    }
}
exports.GetStockEntryByIdController = GetStockEntryByIdController;
//# sourceMappingURL=GetStockEntryByIdController.js.map