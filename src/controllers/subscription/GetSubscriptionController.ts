import { Request, Response } from 'express';
import { GetSubscriptionService } from '../../services/subscription/GetSubscriptionService';

class GetSubscriptionController {
    async handle(req: Request, res: Response) {
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({
                error: 'Organização não identificada',
            });
        }

        const service = new GetSubscriptionService();
        const subscription = await service.execute(organizationId);

        return res.json(subscription);
    }
}

export { GetSubscriptionController };
