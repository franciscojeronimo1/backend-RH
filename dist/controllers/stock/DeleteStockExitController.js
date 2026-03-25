"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteStockExitController = void 0;
const DeleteStockExitService_1 = require("../../services/stock/DeleteStockExitService");
class DeleteStockExitController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const deleteStockExitService = new DeleteStockExitService_1.DeleteStockExitService();
        const result = await deleteStockExitService.execute(id, req.user.organizationId);
        return res.json(result);
    }
}
exports.DeleteStockExitController = DeleteStockExitController;
//# sourceMappingURL=DeleteStockExitController.js.map