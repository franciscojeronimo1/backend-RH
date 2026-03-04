import { prismaClient } from '../../config/prismaClient';
import { stripe } from '../../utils/stripe';

const returnUrl = process.env.STRIPE_SUCCESS_URL || process.env.FRONTEND_URL || 'http://localhost:3000/administracao';

class CreatePortalSessionService {
    async execute(organizationId: string) {
        const subscription = await prismaClient.subscription.findUnique({
            where: { organizationId },
        });

        if (!subscription?.stripeCustomerId) {
            throw new Error('Nenhuma assinatura Stripe encontrada para esta organização');
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: returnUrl,
        });

        return { url: session.url };
    }
}

export { CreatePortalSessionService };
