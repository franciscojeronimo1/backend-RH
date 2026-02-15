"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateProductController = void 0;
const CreateProductService_1 = require("../../services/product/CreateProductService");
class CreateProductController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { name, code, sku, category, minStock, unit, costPrice } = req.body;
        const createProductService = new CreateProductService_1.CreateProductService();
        const product = await createProductService.execute(req.user.organizationId, name, code, sku, category, minStock, unit, costPrice);
        return res.status(201).json({
            message: 'Produto criado com sucesso',
            product,
        });
    }
}
exports.CreateProductController = CreateProductController;
//# sourceMappingURL=CreateProductController.js.map