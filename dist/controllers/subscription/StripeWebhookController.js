"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookController = void 0;
const stripe_1 = require("../../utils/stripe");
const prismaClient_1 = require("../../config/prismaClient");
function subscriptionCurrentPeriodEndUnix(sub) {
    const fromItem = sub.items?.data?.[0]?.current_period_end;
    if (typeof fromItem === 'number')
        return fromItem;
    if (typeof sub.trial_end === 'number')
        return sub.trial_end;
    return undefined;
}
function isPremiumEligibleStripeStatus(status) {
    return status === 'active' || status === 'trialing';
}
async function syncPremiumFromStripeSubscription(organizationId, stripeCustomerId, stripeSubscriptionId) {
    const sub = await stripe_1.stripe.subscriptions.retrieve(stripeSubscriptionId);
    if (!isPremiumEligibleStripeStatus(sub.status)) {
        console.warn('[Webhook] Assinatura %s ainda não elegível para Premium no app (status Stripe=%s). Comum com boleto até o pagamento compensar.', stripeSubscriptionId, sub.status);
        return;
    }
    const periodEnd = subscriptionCurrentPeriodEndUnix(sub);
    const isTrialing = sub.status === 'trialing';
    await prismaClient_1.prismaClient.subscription.update({
        where: { organizationId },
        data: {
            stripeCustomerId,
            stripeSubscriptionId: sub.id,
            plan: 'PREMIUM',
            status: isTrialing ? 'TRIAL' : 'ACTIVE',
            expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
            trialEndsAt: isTrialing && sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        },
    });
}
function checkoutSessionCustomerId(session) {
    const c = session.customer;
    if (typeof c === 'string')
        return c;
    if (c && typeof c === 'object' && 'id' in c && !('deleted' in c && c.deleted)) {
        return c.id;
    }
    return null;
}
async function handleCheckoutSessionForSubscription(session) {
    if (session.mode !== 'subscription' || !session.subscription) {
        return;
    }
    if (!session.metadata?.organizationId) {
        console.warn('[Webhook] Checkout Session sem metadata.organizationId — assinatura provavelmente fora do app; banco não será atualizado.');
        return;
    }
    await syncPremiumFromStripeSubscription(session.metadata.organizationId, checkoutSessionCustomerId(session), session.subscription);
}
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
                case 'checkout.session.completed':
                case 'checkout.session.async_payment_succeeded': {
                    const session = event.data.object;
                    await handleCheckoutSessionForSubscription(session);
                    break;
                }
                case 'invoice.paid':
                case 'invoice.payment_succeeded': {
                    const invoice = event.data.object;
                    const subDetails = invoice.parent?.type === 'subscription_details'
                        ? invoice.parent.subscription_details
                        : null;
                    const subRef = subDetails?.subscription;
                    const subId = typeof subRef === 'string'
                        ? subRef
                        : subRef && typeof subRef === 'object' && 'id' in subRef
                            ? subRef.id
                            : null;
                    if (!subId)
                        break;
                    const sub = await stripe_1.stripe.subscriptions.retrieve(subId);
                    const orgId = sub.metadata?.organizationId ?? subDetails?.metadata?.organizationId;
                    if (!orgId || typeof orgId !== 'string') {
                        console.warn('[Webhook] invoice pago: assinatura %s sem metadata.organizationId.', subId);
                        break;
                    }
                    const custId = typeof invoice.customer === 'string'
                        ? invoice.customer
                        : invoice.customer && typeof invoice.customer === 'object' && 'id' in invoice.customer
                            ? invoice.customer.id
                            : null;
                    await syncPremiumFromStripeSubscription(orgId, custId, subId);
                    break;
                }
                case 'customer.subscription.updated': {
                    const sub = event.data.object;
                    const periodEnd = subscriptionCurrentPeriodEndUnix(sub);
                    const cancelAtPeriodEnd = sub.cancel_at_period_end;
                    const status = sub.status === 'active' ? 'ACTIVE' : sub.status === 'trialing' ? 'TRIAL' : 'CANCELLED';
                    const updated = await prismaClient_1.prismaClient.subscription.updateMany({
                        where: { stripeSubscriptionId: sub.id },
                        data: {
                            status: status,
                            expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
                            cancelAtPeriodEnd: !!cancelAtPeriodEnd,
                            trialEndsAt: sub.status === 'trialing' && sub.trial_end
                                ? new Date(sub.trial_end * 1000)
                                : null,
                        },
                    });
                    if (updated.count === 0 && sub.metadata?.organizationId) {
                        const custId = typeof sub.customer === 'string'
                            ? sub.customer
                            : sub.customer && typeof sub.customer === 'object'
                                ? sub.customer.id
                                : null;
                        if (isPremiumEligibleStripeStatus(sub.status)) {
                            await syncPremiumFromStripeSubscription(sub.metadata.organizationId, custId, sub.id);
                        }
                    }
                    else if (updated.count === 0) {
                        console.warn('[Webhook] customer.subscription.updated sem linha no banco com stripeSubscriptionId=%s — faça o checkout pelo app ou vincule a assinatura.', sub.id);
                    }
                    break;
                }
                case 'customer.subscription.created': {
                    const sub = event.data.object;
                    const orgId = sub.metadata?.organizationId;
                    if (!orgId) {
                        console.warn('[Webhook] customer.subscription.created sem metadata.organizationId — ignorado.');
                        break;
                    }
                    const custId = typeof sub.customer === 'string'
                        ? sub.customer
                        : sub.customer && typeof sub.customer === 'object' && 'id' in sub.customer
                            ? sub.customer.id
                            : null;
                    await syncPremiumFromStripeSubscription(orgId, custId, sub.id);
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
                            trialEndsAt: null,
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