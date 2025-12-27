import { Request, Response } from 'express';
import { UpdateUserService } from '../../services/user/UpdateUserService';

class UpdateUserController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        const { name, email, password, role } = req.body;
        const updateUserService = new UpdateUserService();
        const user = await updateUserService.execute(id as unknown as string, { name, email, password, role });
        return res.json({ message: 'Usuário atualizado com sucesso', user });
    }
}

export { UpdateUserController };

