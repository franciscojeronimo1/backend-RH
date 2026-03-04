import { prismaClient } from '../../config/prismaClient';

class GetSubscriptionService {
    async execute(organizationId: string) {
        const subscription = await prismaClient.subscription.findUnique({
            where: { organizationId },
        });

        if (!subscription) {
            return {
                plan: 'FREE' as const,
                status: 'ACTIVE' as const,
                isPremium: false,
                message: 'Nenhuma assinatura ativa. Faça upgrade para Premium para desbloquear todos os recursos.',
            };
        }

        const isPremium = subscription.plan === 'PREMIUM' && (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL');

        return {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            isPremium,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            trialEndsAt: subscription.trialEndsAt,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
        };
    }
}

export { GetSubscriptionService };
