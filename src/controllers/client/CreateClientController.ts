import { Request, Response } from 'express';
import { CreateClientService } from '../../services/client/CreateClientService';

class CreateClientController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const createClientService = new CreateClientService();
        const client = await createClientService.execute(req.user.organizationId, req.body);

        return res.status(201).json({
            message: 'Cliente criado com sucesso',
            client,
        });
    }
}

export { CreateClientController };
