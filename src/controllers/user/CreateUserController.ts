import { Request, Response } from 'express';
import { CreateUserService } from '../../services/user/CreateUserService';

class CreateUserController {
    async handle(req: Request, res: Response) {
        const { name, email, password } = req.body;
        const createUserService = new CreateUserService();
        const result = await createUserService.execute(name, email, password);
        return res.status(201).json({ 
            message: 'Usuário criado com sucesso', 
            user: result.user,
            token: result.token 
        });
    }
}

export { CreateUserController };