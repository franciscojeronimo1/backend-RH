"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProductController = void 0;
const UpdateProductService_1 = require("../../services/product/UpdateProductService");
class UpdateProductController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const { name, code, sku, category, minStock, unit, costPrice, active } = req.body;
        const updateProductService = new UpdateProductService_1.UpdateProductService();
        const product = await updateProductService.execute(id, req.user.organizationId, { name, code, sku, category, minStock, unit, costPrice, active });
        return res.json({
            message: 'Produto atualizado com sucesso',
            product,
        });
    }
}
exports.UpdateProductController = UpdateProductController;
//# sourceMappingURL=UpdateProductController.js.map