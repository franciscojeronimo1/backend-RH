"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCheckoutService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const stripe_1 = require("../../utils/stripe");
const stripe_2 = require("../../utils/stripe");
const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
const successUrl = process.env.STRIPE_SUCCESS_URL;
const cancelUrl = process.env.STRIPE_CANCEL_URL;
if (!priceId) {
    throw new Error('STRIPE_PREMIUM_PRICE_ID não está definida no .env');
}
class CreateCheckoutService {
    async execute(organizationId, userEmail, userName) {
        const subscription = await prismaClient_1.prismaClient.subscription.findUnique({
            where: { organizationId },
        });
        if (!subscription) {
            throw new Error('Assinatura não encontrada para esta organização');
        }
        if (subscription.plan === 'PREMIUM' &&
            (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL')) {
            throw new Error('Organização já possui plano Premium ativo ou em período de trial');
        }
        const customer = await (0, stripe_1.createStripeCustomer)({
            email: userEmail,
            name: userName,
        });
        const session = await stripe_2.stripe.checkout.sessions.create({
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
                trial_period_days: 30,
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
exports.CreateCheckoutService = CreateCheckoutService;
//# sourceMappingURL=CreateCheckoutService.js.map