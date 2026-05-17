import { Request, Response } from 'express';
import { CreateStockExitsBatchService } from '../../services/stock/CreateStockExitsBatchService';

class CreateStockExitsBatchController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { projectName, clientName, serviceType, notes, items } = req.body;

        const createStockExitsBatchService = new CreateStockExitsBatchService();
        const exits = await createStockExitsBatchService.execute(
            req.user.organizationId,
            req.user.id,
            items,
            { projectName, clientName, serviceType, notes }
        );

        return res.status(201).json({
            message: `${exits.length} saída(s) registrada(s) com sucesso`,
            exits,
        });
    }
}

export { CreateStockExitsBatchController };
