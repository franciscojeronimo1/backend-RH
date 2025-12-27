import { Request, Response } from 'express';
import { ListUsersService } from '../../services/user/ListUsersService';

class ListUsersController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const listUsersService = new ListUsersService();
        const users = await listUsersService.execute(req.user.role, req.user.id);
        return res.json({ users });
    }
}

export { ListUsersController };

