"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.premiumMiddleware = void 0;
const prismaClient_1 = require("../config/prismaClient");
const premiumMiddleware = async (req, res, next) => {
    try {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                error: 'Organização não identificada',
                code: 'NO_ORGANIZATION',
            });
        }
        const subscription = await prismaClient_1.prismaClient.subscription.findUnique({
            where: { organizationId },
        });
        if (!subscription) {
            return res.status(403).json({
                error: 'Plano Premium necessário para acessar este recurso',
                code: 'SUBSCRIPTION_REQUIRED',
            });
        }
        if (subscription.plan !== 'PREMIUM') {
            return res.status(403).json({
                error: 'Plano Premium necessário para acessar este recurso',
                code: 'SUBSCRIPTION_REQUIRED',
            });
        }
        if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
            return res.status(403).json({
                error: 'Assinatura inativa ou expirada',
                code: 'SUBSCRIPTION_INACTIVE',
            });
        }
        req.subscription = subscription;
        return next();
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar assinatura' });
    }
};
exports.premiumMiddleware = premiumMiddleware;
//# sourceMappingURL=premiumMiddleware.js.map