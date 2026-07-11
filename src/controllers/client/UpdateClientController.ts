import { Request, Response } from 'express';
import { UpdateClientService } from '../../services/client/UpdateClientService';

class UpdateClientController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const updateClientService = new UpdateClientService();
        const client = await updateClientService.execute(
            id as string,
            req.user.organizationId,
            req.body
        );

        return res.json({
            message: 'Cliente atualizado com sucesso',
            client,
        });
    }
}

export { UpdateClientController };
