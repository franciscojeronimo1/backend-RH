import { Request, Response } from 'express';
import { DeleteCategoryService } from '../../services/category/DeleteCategoryService';

class DeleteCategoryController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const deleteCategoryService = new DeleteCategoryService();
        const result = await deleteCategoryService.execute(
            id as string,
            req.user.organizationId
        );

        return res.json(result);
    }
}

export { DeleteCategoryController };
