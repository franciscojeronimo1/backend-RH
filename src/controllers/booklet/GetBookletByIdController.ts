import { Request, Response } from 'express';
import { GetBookletByIdService } from '../../services/booklet/GetBookletByIdService';

class GetBookletByIdController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { id } = req.params;
        const getBookletByIdService = new GetBookletByIdService();
        const booklet = await getBookletByIdService.execute(id as string, req.user.organizationId);

        return res.json({ booklet });
    }
}

export { GetBookletByIdController };
