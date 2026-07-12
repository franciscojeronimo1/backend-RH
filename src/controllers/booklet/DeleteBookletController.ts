import { Request, Response } from 'express';
import { DeleteBookletService } from '../../services/booklet/DeleteBookletService';

class DeleteBookletController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const deleteBookletService = new DeleteBookletService();
        const result = await deleteBookletService.execute(id as string, req.user.organizationId);

        return res.json(result);
    }
}

export { DeleteBookletController };
