"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSubscriptionService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class GetSubscriptionService {
    async execute(organizationId) {
        const subscription = await prismaClient_1.prismaClient.subscription.findUnique({
            where: { organizationId },
        });
        if (!subscription) {
            return {
                plan: 'FREE',
                status: 'ACTIVE',
                isPremium: false,
                isTrialing: false,
                message: 'Nenhuma assinatura ativa. Faça upgrade para Premium para desbloquear todos os recursos.',
            };
        }
        const isPremium = subscription.plan === 'PREMIUM' && (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL');
        const isTrialing = subscription.status === 'TRIAL';
        return {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            isPremium,
            isTrialing,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            trialEndsAt: subscription.trialEndsAt,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
        };
    }
}
exports.GetSubscriptionService = GetSubscriptionService;
//# sourceMappingURL=GetSubscriptionService.js.map