import { Request, Response } from 'express';
import { CreatePortalSessionService } from '../../services/subscription/CreatePortalSessionService';

class CreatePortalSessionController {
    async handle(req: Request, res: Response) {
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({
                error: 'Organização não identificada',
            });
        }

        const service = new CreatePortalSessionService();
        const result = await service.execute(organizationId);

        return res.json(result);
    }
}

export { CreatePortalSessionController };
