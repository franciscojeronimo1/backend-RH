import { Request, Response } from 'express';
import { UpdateStockEntryService } from '../../services/stock/UpdateStockEntryService';

class UpdateStockEntryController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const {
            productId,
            quantity,
            unitPrice,
            supplierName,
            supplierDoc,
            invoiceNumber,
            notes,
        } = req.body;

        const updateStockEntryService = new UpdateStockEntryService();
        const entry = await updateStockEntryService.execute(
            id as string,
            req.user.organizationId,
            {
                productId,
                quantity,
                unitPrice,
                supplierName,
                supplierDoc,
                invoiceNumber,
                notes,
            }
        );

        return res.json({
            message: 'Entrada atualizada com sucesso',
            entry,
        });
    }
}

export { UpdateStockEntryController };
