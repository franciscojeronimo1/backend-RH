import { Request, Response } from 'express';
import { UpdateOrganizationService } from '../../services/organization/UpdateOrganizationService';

class UpdateOrganizationController {
    async handle(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { name, cnpj, email, phone, address } = req.body;
        const updateOrganizationService = new UpdateOrganizationService();
        const organization = await updateOrganizationService.execute(
            req.user.organizationId,
            { name, cnpj, email, phone, address }
        );

        return res.json({
            message: 'Organização atualizada com sucesso',
            organization,
        });
    }
}

export { UpdateOrganizationController };

