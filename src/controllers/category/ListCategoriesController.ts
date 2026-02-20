import { Request, Response } from 'express';
import { ListCategoriesService } from '../../services/category/ListCategoriesService';

class ListCategoriesController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const listCategoriesService = new ListCategoriesService();
        const result = await listCategoriesService.execute(req.user.organizationId);
        return res.json(result);
    }
}

export { ListCategoriesController };
