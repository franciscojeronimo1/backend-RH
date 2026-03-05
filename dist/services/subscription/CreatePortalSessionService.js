"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePortalSessionService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const stripe_1 = require("../../utils/stripe");
const returnUrl = process.env.STRIPE_SUCCESS_URL || process.env.FRONTEND_URL || 'http://localhost:3000/administracao';
class CreatePortalSessionService {
    async execute(organizationId) {
        const subscription = await prismaClient_1.prismaClient.subscription.findUnique({
            where: { organizationId },
        });
        if (!subscription?.stripeCustomerId) {
            throw new Error('Nenhuma assinatura Stripe encontrada para esta organização');
        }
        const session = await stripe_1.stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: returnUrl,
        });
        return { url: session.url };
    }
}
exports.CreatePortalSessionService = CreatePortalSessionService;
//# sourceMappingURL=CreatePortalSessionService.js.map