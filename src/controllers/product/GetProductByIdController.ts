import { Request, Response } from 'express';
import { GetProductByIdService } from '../../services/product/GetProductByIdService';

class GetProductByIdController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const getProductByIdService = new GetProductByIdService();
        const product = await getProductByIdService.execute(id as string, req.user.organizationId as string);

        return res.json({ product });
    }
}

export { GetProductByIdController };


