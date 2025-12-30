import { Request, Response } from 'express';
import { ListStockExitsService } from '../../services/stock/ListStockExitsService';

class ListStockExitsController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { productId, date } = req.query;
        const listStockExitsService = new ListStockExitsService();
        const exits = await listStockExitsService.execute(
            req.user.organizationId,
            productId as string | undefined,
            date as string | undefined
        );

        return res.json({ exits });
    }
}

export { ListStockExitsController };


