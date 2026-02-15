"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteProductController = void 0;
const DeleteProductService_1 = require("../../services/product/DeleteProductService");
class DeleteProductController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { id } = req.params;
        const deleteProductService = new DeleteProductService_1.DeleteProductService();
        const result = await deleteProductService.execute(id, req.user.organizationId);
        return res.json(result);
    }
}
exports.DeleteProductController = DeleteProductController;
//# sourceMappingURL=DeleteProductController.js.map