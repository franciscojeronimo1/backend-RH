import { Request, Response } from 'express';
import { GetStockEntryByIdService } from '../../services/stock/GetStockEntryByIdService';

class GetStockEntryByIdController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const getStockEntryByIdService = new GetStockEntryByIdService();
        const entry = await getStockEntryByIdService.execute(
            id as string,
            req.user.organizationId
        );

        return res.json({ entry });
    }
}

export { GetStockEntryByIdController };
