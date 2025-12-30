import { Request, Response } from 'express';
import { UpdateProductService } from '../../services/product/UpdateProductService';

class UpdateProductController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const { name, code, sku, category, minStock, unit, costPrice, active } = req.body;
        const updateProductService = new UpdateProductService();
        const product = await updateProductService.execute(
            id as string,
            req.user.organizationId,
            { name, code, sku, category, minStock, unit, costPrice, active }
        );

        return res.json({
            message: 'Produto atualizado com sucesso',
            product,
        });
    }
}

export { UpdateProductController };


