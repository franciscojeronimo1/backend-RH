import { Request, Response } from 'express';
import { ListProductsService } from '../../services/product/ListProductsService';

class ListProductsController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { category, includeInactive, page, limit } = req.query;
        const listProductsService = new ListProductsService();
        const result = await listProductsService.execute(
            req.user.organizationId,
            category as string | undefined,
            includeInactive === 'true',
            {
                page: page ? parseInt(String(page), 10) : undefined,
                limit: limit ? parseInt(String(limit), 10) : undefined,
            }
        );

        return res.json(result);
    }
}

export { ListProductsController };


