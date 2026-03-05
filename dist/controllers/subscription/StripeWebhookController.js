"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookController = void 0;
const stripe_1 = require("../../utils/stripe");
const prismaClient_1 = require("../../config/prismaClient");
class StripeWebhookController {
    async handle(req, res) {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[Webhook] STRIPE_WEBHOOK_SECRET não configurado');
            return res.status(500).json({ error: 'Webhook não configurado' });
        }
        if (!sig) {
            return res.status(400).json({ error: 'Assinatura Stripe ausente' });
        }
        let event;
        const rawBody = req.body;
        if (Buffer.isBuffer(rawBody)) {
            try {
                event = stripe_1.stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Erro ao verificar assinatura';
                console.error('[Webhook] Assinatura inválida:', message);
                return res.status(400).json({ error: `Webhook Error: ${message}` });
            }
        }
        else {
            return res.status(400).json({ error: 'Body raw esperado para verificação' });
        }
        try {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object;
                    if (session.mode === 'subscription' && session.subscription && session.metadata?.organizationId) {
                        const sub = await stripe_1.stripe.subscriptions.retrieve(session.subscription);
                        const periodEnd = 'current_period_end' in sub ? sub.current_period_end : undefined;
                        await prismaClient_1.prismaClient.subscription.update({
                            where: { organizationId: session.metadata.organizationId },
                            data: {
                                stripeCustomerId: session.customer,
                                stripeSubscriptionId: sub.id,
                                plan: 'PREMIUM',
                                status: 'ACTIVE',
                                expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
                            },
                        });
                    }
                    break;
                }
                case 'customer.subscription.updated': {
                    const sub = event.data.object;
                    const periodEnd = 'current_period_end' in sub ? sub.current_period_end : undefined;
                    const cancelAtPeriodEnd = 'cancel_at_period_end' in sub ? sub.cancel_at_period_end : false;
                    const status = sub.status === 'active' ? 'ACTIVE' : sub.status === 'trialing' ? 'TRIAL' : 'CANCELLED';
                    await prismaClient_1.prismaClient.subscription.updateMany({
                        where: { stripeSubscriptionId: sub.id },
                        data: {
                            status: status,
                            expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
                            cancelAtPeriodEnd: !!cancelAtPeriodEnd,
                        },
                    });
                    break;
                }
                case 'customer.subscription.deleted': {
                    const sub = event.data.object;
                    await prismaClient_1.prismaClient.subscription.updateMany({
                        where: { stripeSubscriptionId: sub.id },
                        data: {
                            plan: 'FREE',
                            status: 'EXPIRED',
                            stripeSubscriptionId: null,
                            cancelAtPeriodEnd: false,
                        },
                    });
                    break;
                }
                default:
                    break;
            }
        }
        catch (error) {
            console.error('[Webhook] Erro ao processar evento:', event.type, error);
            return res.status(500).json({ error: 'Erro ao processar webhook' });
        }
        return res.json({ received: true });
    }
}
exports.StripeWebhookController = StripeWebhookController;
//# sourceMappingURL=StripeWebhookController.js.map