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
                needsPayment: false,
                message: 'Nenhuma assinatura ativa. Faça upgrade para Premium para desbloquear todos os recursos.',
            };
        }
        const isPremium = subscription.plan === 'PREMIUM' && (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL');
        const isTrialing = subscription.status === 'TRIAL';
        const needsPayment = subscription.plan === 'PREMIUM' && subscription.status === 'EXPIRED';
        return {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            isPremium,
            isTrialing,
            needsPayment,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            trialEndsAt: subscription.trialEndsAt,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
            ...(needsPayment && {
                message: 'Seu teste gratuito encerrou ou há pagamento pendente. Cadastre uma forma de pagamento e conclua o pagamento para continuar com o Premium.',
            }),
        };
    }
}
exports.GetSubscriptionService = GetSubscriptionService;
//# sourceMappingURL=GetSubscriptionService.js.map