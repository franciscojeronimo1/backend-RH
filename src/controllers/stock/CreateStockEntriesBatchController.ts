import { Request, Response } from 'express';
import { CreateStockEntriesBatchService } from '../../services/stock/CreateStockEntriesBatchService';

class CreateStockEntriesBatchController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { supplierName, supplierDoc, invoiceNumber, notes, items } = req.body;

        const createStockEntriesBatchService = new CreateStockEntriesBatchService();
        const entries = await createStockEntriesBatchService.execute(
            req.user.organizationId,
            req.user.id,
            items,
            { supplierName, supplierDoc, invoiceNumber, notes }
        );

        return res.status(201).json({
            message: `${entries.length} entrada(s) registrada(s) com sucesso`,
            entries,
        });
    }
}

export { CreateStockEntriesBatchController };
