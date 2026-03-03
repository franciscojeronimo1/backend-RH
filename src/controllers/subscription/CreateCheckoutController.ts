import { Request, Response } from 'express';
import { CreateCheckoutService } from '../../services/subscription/CreateCheckoutService';
import { prismaClient } from '../../config/prismaClient';

class CreateCheckoutController {
    async handle(req: Request, res: Response) {
        const organizationId = req.user?.organizationId;
        const userEmail = req.user?.email;

        if (!organizationId || !userEmail) {
            return res.status(400).json({
                error: 'Organização ou email não identificados',
            });
        }

        const user = await prismaClient.user.findUnique({
            where: { id: req.user!.id },
            select: { name: true },
        });

        const service = new CreateCheckoutService();
        const result = await service.execute(
            organizationId,
            userEmail,
            user?.name ?? undefined
        );

        return res.json(result);
    }
}

export { CreateCheckoutController };
