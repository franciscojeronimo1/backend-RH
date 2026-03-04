import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../../utils/stripe';
import { prismaClient } from '../../config/prismaClient';

/**
 * Webhook do Stripe - recebe eventos (checkout concluído, assinatura cancelada, etc).
 * IMPORTANTE: Esta rota deve receber o body RAW (não parseado como JSON)
 * para que a assinatura possa ser verificada.
 */
class StripeWebhookController {
    async handle(req: Request, res: Response) {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('[Webhook] STRIPE_WEBHOOK_SECRET não configurado');
            return res.status(500).json({ error: 'Webhook não configurado' });
        }

        if (!sig) {
            return res.status(400).json({ error: 'Assinatura Stripe ausente' });
        }

        let event: Stripe.Event;
        const rawBody = req.body;

        if (Buffer.isBuffer(rawBody)) {
            try {
                event = stripe.webhooks.constructEvent(
                    rawBody,
                    sig,
                    webhookSecret
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Erro ao verificar assinatura';
                console.error('[Webhook] Assinatura inválida:', message);
                return res.status(400).json({ error: `Webhook Error: ${message}` });
            }
        } else {
            return res.status(400).json({ error: 'Body raw esperado para verificação' });
        }

        try {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object as Stripe.Checkout.Session;
                    if (session.mode === 'subscription' && session.subscription && session.metadata?.organizationId) {
                        const sub = await stripe.subscriptions.retrieve(
                            session.subscription as string
                        );
                        const periodEnd = 'current_period_end' in sub ? (sub as { current_period_end?: number }).current_period_end : undefined;
                        await prismaClient.subscription.update({
                            where: { organizationId: session.metadata.organizationId },
                            data: {
                                stripeCustomerId: session.customer as string,
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
                    const sub = event.data.object as Stripe.Subscription;
                    const periodEnd = 'current_period_end' in sub ? (sub as { current_period_end?: number }).current_period_end : undefined;
                    const cancelAtPeriodEnd = 'cancel_at_period_end' in sub ? (sub as { cancel_at_period_end?: boolean }).cancel_at_period_end : false;
                    const status = sub.status === 'active' ? 'ACTIVE' : sub.status === 'trialing' ? 'TRIAL' : 'CANCELLED';
                    await prismaClient.subscription.updateMany({
                        where: { stripeSubscriptionId: sub.id },
                        data: {
                            status: status as 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED',
                            expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
                            cancelAtPeriodEnd: !!cancelAtPeriodEnd,
                        },
                    });
                    break;
                }
                case 'customer.subscription.deleted': {
                    const sub = event.data.object as Stripe.Subscription;
                    await prismaClient.subscription.updateMany({
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
                    // Eventos não tratados são ignorados (Stripe envia muitos)
                    break;
            }
        } catch (error) {
            console.error('[Webhook] Erro ao processar evento:', event.type, error);
            return res.status(500).json({ error: 'Erro ao processar webhook' });
        }

        return res.json({ received: true });
    }
}

export { StripeWebhookController };
