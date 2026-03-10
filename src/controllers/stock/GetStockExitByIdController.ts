import { Request, Response } from 'express';
import { GetStockExitByIdService } from '../../services/stock/GetStockExitByIdService';

class GetStockExitByIdController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const getStockExitByIdService = new GetStockExitByIdService();
        const exit = await getStockExitByIdService.execute(
            id as string,
            req.user.organizationId
        );

        return res.json({ exit });
    }
}

export { GetStockExitByIdController };
