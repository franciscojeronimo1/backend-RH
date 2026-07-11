import { Request, Response } from 'express';
import { DeleteClientService } from '../../services/client/DeleteClientService';

class DeleteClientController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const deleteClientService = new DeleteClientService();
        const result = await deleteClientService.execute(id as string, req.user.organizationId);

        return res.json(result);
    }
}

export { DeleteClientController };
