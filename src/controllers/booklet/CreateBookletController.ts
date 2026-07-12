import { Request, Response } from 'express';
import { CreateBookletService } from '../../services/booklet/CreateBookletService';

class CreateBookletController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const createBookletService = new CreateBookletService();
        const booklet = await createBookletService.execute(req.user.organizationId, req.body);

        return res.status(201).json({
            message: 'Carnê criado com sucesso',
            booklet,
        });
    }
}

export { CreateBookletController };
