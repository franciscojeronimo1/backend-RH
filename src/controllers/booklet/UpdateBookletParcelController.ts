import { Request, Response } from 'express';
import { UpdateBookletParcelService } from '../../services/booklet/UpdateBookletParcelService';

class UpdateBookletParcelController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id, parcelId } = req.params;
        const { status } = req.body;
        const updateBookletParcelService = new UpdateBookletParcelService();
        const parcel = await updateBookletParcelService.execute(
            id as string,
            parcelId as string,
            req.user.organizationId,
            status
        );

        return res.json({
            message: 'Parcela atualizada com sucesso',
            parcel,
        });
    }
}

export { UpdateBookletParcelController };
