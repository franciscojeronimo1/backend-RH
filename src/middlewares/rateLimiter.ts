import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Rate limiter geral: por usuário (quando autenticado) ou por IP (rotas públicas).

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // 300 requisições por janela (por usuário ou por IP)
    message: 'Muitas requisições. Aguarde alguns minutos e tente novamente.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const user = (req as any).user;
        return user?.id ?? req.ip ?? 'unknown';
    },
});

// Rate limiter mais restritivo para login (proteção contra brute force)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max:10, // máximo de 10 tentativas de login por IP
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // não conta requisições bem-sucedidas
});

// Rate limiter para criação de usuários
export const createUserLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // máximo de 5 criações de usuário por IP por hora
    message: 'Muitas tentativas de criação de conta. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

