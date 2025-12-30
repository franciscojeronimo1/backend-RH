import { Request, Response } from 'express';
import { GetOrganizationService } from '../../services/organization/GetOrganizationService';

class GetOrganizationController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const getOrganizationService = new GetOrganizationService();
        const organization = await getOrganizationService.execute(req.user.organizationId);

        return res.json({ organization });
    }
}

export { GetOrganizationController };

