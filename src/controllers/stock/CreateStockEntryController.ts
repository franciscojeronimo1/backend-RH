import { Request, Response } from 'express';
import { CreateStockEntryService } from '../../services/stock/CreateStockEntryService';

class CreateStockEntryController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const {
            productId,
            quantity,
            unitPrice,
            supplierName,
            supplierDoc,
            invoiceNumber,
            notes,
        } = req.body;

        const createStockEntryService = new CreateStockEntryService();
        const entry = await createStockEntryService.execute(
            req.user.organizationId,
            productId,
            req.user.id,
            quantity,
            unitPrice,
            supplierName,
            supplierDoc,
            invoiceNumber,
            notes
        );

        return res.status(201).json({
            message: 'Entrada registrada com sucesso',
            entry,
        });
    }
}

export { CreateStockEntryController };


