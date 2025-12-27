import { Request, Response } from 'express';
import { DeleteUserService } from '../../services/user/DeleteUserService';

class DeleteUserController {
    async handle(req: Request, res: Response) {
        const { id } = req.params;
        const deleteUserService = new DeleteUserService();
        const result = await deleteUserService.execute(id as unknown as string);
        return res.json(result);
    }
}

export { DeleteUserController };

