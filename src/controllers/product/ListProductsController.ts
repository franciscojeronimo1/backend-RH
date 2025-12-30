import { Request, Response } from 'express';
import { ListProductsService } from '../../services/product/ListProductsService';

class ListProductsController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { category, includeInactive } = req.query;
        const listProductsService = new ListProductsService();
        const products = await listProductsService.execute(
            req.user.organizationId,
            category as string | undefined,
            includeInactive === 'true'
        );

        return res.json({ products });
    }
}

export { ListProductsController };


