"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStockExitController = void 0;
const CreateStockExitService_1 = require("../../services/stock/CreateStockExitService");
class CreateStockExitController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { productId, quantity, projectName, clientName, serviceType, notes, } = req.body;
        const createStockExitService = new CreateStockExitService_1.CreateStockExitService();
        const exit = await createStockExitService.execute(req.user.organizationId, productId, req.user.id, quantity, projectName, clientName, serviceType, notes);
        return res.status(201).json({
            message: 'Saída registrada com sucesso',
            exit,
        });
    }
}
exports.CreateStockExitController = CreateStockExitController;
//# sourceMappingURL=CreateStockExitController.js.map