import { Request, Response } from 'express';
import { CreateStaffService } from '../../services/user/CreateStaffService';

class CreateStaffController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { name, email, password } = req.body;
        const adminId = req.user.id;

        const createStaffService = new CreateStaffService();
        const result = await createStaffService.execute(adminId, name, email, password);
        
        return res.status(201).json({ 
            message: 'Usuário STAFF criado com sucesso', 
            user: result.user,
            token: result.token 
        });
    }
}

export { CreateStaffController };

