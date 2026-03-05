import { Request, Response } from 'express';
import { ListStockMovementsService } from '../../services/stock/ListStockMovementsService';

class ListStockMovementsController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { dateFrom, dateTo, productId, supplier, client, type, page, limit } = req.query;

        const listStockMovementsService = new ListStockMovementsService();
        const result = await listStockMovementsService.execute(req.user.organizationId, {
            dateFrom: dateFrom as string | undefined,
            dateTo: dateTo as string | undefined,
            productId: productId as string | undefined,
            supplier: supplier as string | undefined,
            client: client as string | undefined,
            type: type === 'entry' || type === 'exit' ? type : undefined,
            page: page ? parseInt(String(page), 10) : undefined,
            limit: limit ? parseInt(String(limit), 10) : undefined,
        });

        return res.json(result);
    }
}

export { ListStockMovementsController };
