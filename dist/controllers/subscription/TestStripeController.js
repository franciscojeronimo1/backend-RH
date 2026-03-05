"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestStripeController = void 0;
const stripe_1 = require("../../utils/stripe");
class TestStripeController {
    async handle(_req, res) {
        try {
            await stripe_1.stripe.customers.list({ limit: 1 });
            return res.json({
                ok: true,
                message: 'Conexão com Stripe OK',
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({
                ok: false,
                error: 'Falha ao conectar com Stripe',
                details: message,
            });
        }
    }
}
exports.TestStripeController = TestStripeController;
//# sourceMappingURL=TestStripeController.js.map