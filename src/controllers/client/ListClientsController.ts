import { Request, Response } from 'express';
import { ListClientsService } from '../../services/client/ListClientsService';

class ListClientsController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { includeInactive, page, limit, search } = req.query;
        const listClientsService = new ListClientsService();
        const result = await listClientsService.execute(
            req.user.organizationId,
            includeInactive === 'true',
            {
                page: page ? parseInt(String(page), 10) : undefined,
                limit: limit ? parseInt(String(limit), 10) : undefined,
            },
            search as string | undefined
        );

        return res.json(result);
    }
}

export { ListClientsController };
