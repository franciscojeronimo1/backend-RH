import { Request, Response } from 'express';
import { DeleteStockEntryService } from '../../services/stock/DeleteStockEntryService';

class DeleteStockEntryController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const deleteStockEntryService = new DeleteStockEntryService();
        const result = await deleteStockEntryService.execute(id as string, req.user.organizationId);

        return res.json(result);
    }
}

export { DeleteStockEntryController };
