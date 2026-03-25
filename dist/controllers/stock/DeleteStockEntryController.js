"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteStockEntryController = void 0;
const DeleteStockEntryService_1 = require("../../services/stock/DeleteStockEntryService");
class DeleteStockEntryController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const deleteStockEntryService = new DeleteStockEntryService_1.DeleteStockEntryService();
        const result = await deleteStockEntryService.execute(id, req.user.organizationId);
        return res.json(result);
    }
}
exports.DeleteStockEntryController = DeleteStockEntryController;
//# sourceMappingURL=DeleteStockEntryController.js.map