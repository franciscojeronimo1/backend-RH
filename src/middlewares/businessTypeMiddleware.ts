import { Request, Response, NextFunction } from 'express';

type BusinessType = 'STANDARD' | 'GYM';

/**
 * Restringe a rota a um tipo de negócio. Deve ser usado depois do tenantMiddleware.
 *  - requireGym: rotas do módulo Academia (só organizações GYM).
 *  - requireStandard: rotas do sistema atual (clientes, carnês, ponto, estoque) — bloqueadas para GYM.
 */
const requireBusinessType = (allowed: BusinessType) => (req: Request, res: Response, next: NextFunction) => {
    const current = req.user?.businessType ?? 'STANDARD';
    if (current !== allowed) {
        return res.status(403).json({
            error:
                allowed === 'GYM'
                    ? 'Recurso disponível apenas para academias.'
                    : 'Recurso não disponível para este tipo de empresa.',
            code: 'BUSINESS_TYPE_NOT_ALLOWED',
        });
    }
    return next();
};

export const requireGym = requireBusinessType('GYM');
export const requireStandard = requireBusinessType('STANDARD');

/** Bloqueia checkout/portal do Stripe para organizações com cobrança manual. */
export const blockIfBillingExempt = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.billingExempt) {
        return res.status(400).json({
            error: 'A assinatura desta empresa é gerenciada manualmente. Não há pagamento a fazer por aqui.',
            code: 'BILLING_MANAGED_MANUALLY',
        });
    }
    return next();
};
