import { Request, Response } from 'express';
import { CreateOrganizationService } from '../../services/organization/CreateOrganizationService';

class CreateOrganizationController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { name, cnpj, email, phone, address } = req.body;
        const createOrganizationService = new CreateOrganizationService();
        const organization = await createOrganizationService.execute(
            name,
            req.user.id,
            cnpj,
            email,
            phone,
            address
        );

        return res.status(201).json({
            message: 'Organização criada com sucesso',
            organization,
        });
    }
}

export { CreateOrganizationController };


