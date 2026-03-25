"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetStockExitByIdController = void 0;
const GetStockExitByIdService_1 = require("../../services/stock/GetStockExitByIdService");
class GetStockExitByIdController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const getStockExitByIdService = new GetStockExitByIdService_1.GetStockExitByIdService();
        const exit = await getStockExitByIdService.execute(id, req.user.organizationId);
        return res.json({ exit });
    }
}
exports.GetStockExitByIdController = GetStockExitByIdController;
//# sourceMappingURL=GetStockExitByIdController.js.map