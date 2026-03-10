"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStockEntryController = void 0;
const UpdateStockEntryService_1 = require("../../services/stock/UpdateStockEntryService");
class UpdateStockEntryController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const { productId, quantity, unitPrice, supplierName, supplierDoc, invoiceNumber, notes, } = req.body;
        const updateStockEntryService = new UpdateStockEntryService_1.UpdateStockEntryService();
        const entry = await updateStockEntryService.execute(id, req.user.organizationId, {
            productId,
            quantity,
            unitPrice,
            supplierName,
            supplierDoc,
            invoiceNumber,
            notes,
        });
        return res.json({
            message: 'Entrada atualizada com sucesso',
            entry,
        });
    }
}
exports.UpdateStockEntryController = UpdateStockEntryController;
//# sourceMappingURL=UpdateStockEntryController.js.map