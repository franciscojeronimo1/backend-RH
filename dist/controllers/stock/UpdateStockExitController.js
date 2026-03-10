"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStockExitController = void 0;
const UpdateStockExitService_1 = require("../../services/stock/UpdateStockExitService");
class UpdateStockExitController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const { productId, quantity, unitPrice, projectName, clientName, serviceType, notes, } = req.body;
        const updateStockExitService = new UpdateStockExitService_1.UpdateStockExitService();
        const exit = await updateStockExitService.execute(id, req.user.organizationId, {
            productId,
            quantity,
            unitPrice,
            projectName,
            clientName,
            serviceType,
            notes,
        });
        return res.json({
            message: 'Saída atualizada com sucesso',
            exit,
        });
    }
}
exports.UpdateStockExitController = UpdateStockExitController;
//# sourceMappingURL=UpdateStockExitController.js.map