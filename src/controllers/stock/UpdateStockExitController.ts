import { Request, Response } from 'express';
import { UpdateStockExitService } from '../../services/stock/UpdateStockExitService';

class UpdateStockExitController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const {
            productId,
            quantity,
            unitPrice,
            projectName,
            clientName,
            serviceType,
            notes,
        } = req.body;

        const updateStockExitService = new UpdateStockExitService();
        const exit = await updateStockExitService.execute(
            id as string,
            req.user.organizationId,
            {
                productId,
                quantity,
                unitPrice,
                projectName,
                clientName,
                serviceType,
                notes,
            }
        );

        return res.json({
            message: 'Saída atualizada com sucesso',
            exit,
        });
    }
}

export { UpdateStockExitController };
