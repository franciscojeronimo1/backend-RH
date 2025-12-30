import { Request, Response } from 'express';
import { ListStockEntriesService } from '../../services/stock/ListStockEntriesService';

class ListStockEntriesController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { productId, date } = req.query;
        const listStockEntriesService = new ListStockEntriesService();
        const entries = await listStockEntriesService.execute(
            req.user.organizationId,
            productId as string | undefined,
            date as string | undefined
        );

        return res.json({ entries });
    }
}

export { ListStockEntriesController };


