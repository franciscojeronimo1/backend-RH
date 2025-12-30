import { Request, Response } from 'express';
import { CreateStockExitService } from '../../services/stock/CreateStockExitService';

class CreateStockExitController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const {
            productId,
            quantity,
            projectName,
            clientName,
            serviceType,
            notes,
        } = req.body;

        const createStockExitService = new CreateStockExitService();
        const exit = await createStockExitService.execute(
            req.user.organizationId,
            productId,
            req.user.id,
            quantity,
            projectName,
            clientName,
            serviceType,
            notes
        );

        return res.status(201).json({
            message: 'Saída registrada com sucesso',
            exit,
        });
    }
}

export { CreateStockExitController };


