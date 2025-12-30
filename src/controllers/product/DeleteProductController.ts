import { Request, Response } from 'express';
import { DeleteProductService } from '../../services/product/DeleteProductService';

class DeleteProductController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const deleteProductService = new DeleteProductService();
        const result = await deleteProductService.execute(id as string, req.user.organizationId as string);

        return res.json(result);
    }
}

export { DeleteProductController };


