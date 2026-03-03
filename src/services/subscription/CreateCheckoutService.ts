import { prismaClient } from '../../config/prismaClient';
import { createStripeCustomer } from '../../utils/stripe';
import { stripe } from '../../utils/stripe';

const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
const successUrl = process.env.STRIPE_SUCCESS_URL;
const cancelUrl = process.env.STRIPE_CANCEL_URL;

if (!priceId) {
    throw new Error('STRIPE_PREMIUM_PRICE_ID não está definida no .env');
}

class CreateCheckoutService {
    async execute(organizationId: string, userEmail: string, userName?: string) {
        const subscription = await prismaClient.subscription.findUnique({
            where: { organizationId },
        });

        if (!subscription) {
            throw new Error('Assinatura não encontrada para esta organização');
        }

        if (subscription.plan === 'PREMIUM' && subscription.status === 'ACTIVE') {
            throw new Error('Organização já possui plano Premium ativo');
        }

        const customer = await createStripeCustomer({
            email: userEmail,
            name: userName,
        });

        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || `${process.env.FRONTEND_URL}/administracao?success=1`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/administracao`,
            metadata: {
                organizationId,
            },
            subscription_data: {
                metadata: {
                    organizationId,
                },
            },
        });

        return {
            url: session.url,
            sessionId: session.id,
        };
    }
}

export { CreateCheckoutService };
