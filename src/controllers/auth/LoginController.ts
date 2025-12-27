import { Request, Response } from 'express';
import { LoginService } from '../../services/auth/LoginService';

class LoginController {
    async handle(req: Request, res: Response) {
        const { email, password } = req.body;
        const loginService = new LoginService();
        const result = await loginService.execute(email, password);
        return res.json({ message: 'Login realizado com sucesso', ...result });
    }
}

export { LoginController };

