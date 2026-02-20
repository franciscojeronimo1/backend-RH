import { Request, Response } from 'express';
import { UpdateCategoryService } from '../../services/category/UpdateCategoryService';

class UpdateCategoryController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const { name } = req.body;
        const updateCategoryService = new UpdateCategoryService();
        const result = await updateCategoryService.execute(
            id as string,
            req.user.organizationId,
            name
        );

        return res.json(result);
    }
}

export { UpdateCategoryController };
