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
                message: 'Nenhuma assinatura ativa. Faça upgrade para Premium para desbloquear todos os recursos.',
            };
        }
        return {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            isPremium: subscription.plan === 'PREMIUM' && (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL'),
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            trialEndsAt: subscription.trialEndsAt,
        };
    }
}
exports.GetSubscriptionService = GetSubscriptionService;
//# sourceMappingURL=GetSubscriptionService.js.map