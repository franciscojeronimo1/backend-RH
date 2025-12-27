import { Request, Response } from 'express';
import { DeleteUserService } from '../../services/user/DeleteUserService';

class DeleteUserController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { id } = req.params;
        const deleteUserService = new DeleteUserService();
        const result = await deleteUserService.execute(id as unknown as string, req.user.id);
        return res.json(result);
    }
}

export { DeleteUserController };

