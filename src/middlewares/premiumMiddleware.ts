import { Request, Response, NextFunction } from 'express';
import { prismaClient } from '../config/prismaClient';

/**
 * Middleware que exige plano PREMIUM ativo.
 * Deve ser usado após authMiddleware e tenantMiddleware.
 * Usuários FREE recebem 403 com código SUBSCRIPTION_REQUIRED.
 */
export const premiumMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({
                error: 'Organização não identificada',
                code: 'NO_ORGANIZATION',
            });
        }

        const subscription = await prismaClient.subscription.findUnique({
            where: { organizationId },
        });

        // Sem assinatura = FREE (acesso limitado)
        if (!subscription) {
            return res.status(403).json({
                error: 'Plano Premium necessário para acessar este recurso',
                code: 'SUBSCRIPTION_REQUIRED',
            });
        }

        if (subscription.plan !== 'PREMIUM') {
            return res.status(403).json({
                error: 'Plano Premium necessário para acessar este recurso',
                code: 'SUBSCRIPTION_REQUIRED',
            });
        }

        if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
            return res.status(403).json({
                error: 'Assinatura inativa ou expirada',
                code: 'SUBSCRIPTION_INACTIVE',
            });
        }

        // Opcional: adicionar subscription ao request para uso posterior
        (req as Request & { subscription?: typeof subscription }).subscription = subscription;

        return next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar assinatura' });
    }
};
