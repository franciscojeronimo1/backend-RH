import { Request, Response } from 'express';
import { stripe } from '../../utils/stripe';

/**
 * Rota de teste para verificar se a conexão com o Stripe está funcionando.
 */
class TestStripeController {
    async handle(_req: Request, res: Response) {
        try {
            await stripe.customers.list({ limit: 1 });
            return res.json({
                ok: true,
                message: 'Conexão com Stripe OK',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({
                ok: false,
                error: 'Falha ao conectar com Stripe',
                details: message,
            });
        }
    }
}

export { TestStripeController };
