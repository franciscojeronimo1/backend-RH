import { Request, Response } from 'express';
import { CreateCategoryService } from '../../services/category/CreateCategoryService';

class CreateCategoryController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { name } = req.body;
        const createCategoryService = new CreateCategoryService();
        const result = await createCategoryService.execute(req.user.organizationId, name);
        return res.status(201).json(result);
    }
}

export { CreateCategoryController };
