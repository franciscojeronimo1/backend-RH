import { Request, Response } from 'express';
import { CreateProductService } from '../../services/product/CreateProductService';

class CreateProductController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { name, code, sku, category, minStock, unit, costPrice } = req.body;
        const createProductService = new CreateProductService();
        const product = await createProductService.execute(
            req.user.organizationId,
            name,
            code,
            sku,
            category,
            minStock,
            unit,
            costPrice
        );

        return res.status(201).json({
            message: 'Produto criado com sucesso',
            product,
        });
    }
}

export { CreateProductController };


