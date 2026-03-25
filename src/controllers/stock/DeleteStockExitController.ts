import { Request, Response } from 'express';
import { DeleteStockExitService } from '../../services/stock/DeleteStockExitService';

class DeleteStockExitController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const deleteStockExitService = new DeleteStockExitService();
        const result = await deleteStockExitService.execute(id as string, req.user.organizationId);

        return res.json(result);
    }
}

export { DeleteStockExitController };
