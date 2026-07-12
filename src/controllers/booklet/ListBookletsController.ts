import { Request, Response } from 'express';
import { ListBookletsService } from '../../services/booklet/ListBookletsService';

class ListBookletsController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
        const listBookletsService = new ListBookletsService();
        const result = await listBookletsService.execute(req.user.organizationId, clientId);

        return res.json(result);
    }
}

export { ListBookletsController };
