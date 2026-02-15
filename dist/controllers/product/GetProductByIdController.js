"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductByIdController = void 0;
const GetProductByIdService_1 = require("../../services/product/GetProductByIdService");
class GetProductByIdController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const getProductByIdService = new GetProductByIdService_1.GetProductByIdService();
        const product = await getProductByIdService.execute(id, req.user.organizationId);
        return res.json({ product });
    }
}
exports.GetProductByIdController = GetProductByIdController;
//# sourceMappingURL=GetProductByIdController.js.map