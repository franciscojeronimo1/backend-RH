"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStockEntryController = void 0;
const CreateStockEntryService_1 = require("../../services/stock/CreateStockEntryService");
class CreateStockEntryController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { productId, quantity, unitPrice, supplierName, supplierDoc, invoiceNumber, notes, } = req.body;
        const createStockEntryService = new CreateStockEntryService_1.CreateStockEntryService();
        const entry = await createStockEntryService.execute(req.user.organizationId, productId, req.user.id, quantity, unitPrice, supplierName, supplierDoc, invoiceNumber, notes);
        return res.status(201).json({
            message: 'Entrada registrada com sucesso',
            entry,
        });
    }
}
exports.CreateStockEntryController = CreateStockEntryController;
//# sourceMappingURL=CreateStockEntryController.js.map