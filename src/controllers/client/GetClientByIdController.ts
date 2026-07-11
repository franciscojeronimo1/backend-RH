import { Request, Response } from 'express';
import { GetClientByIdService } from '../../services/client/GetClientByIdService';

class GetClientByIdController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const getClientByIdService = new GetClientByIdService();
        const client = await getClientByIdService.execute(id as string, req.user.organizationId);

        return res.json({ client });
    }
}

export { GetClientByIdController };
