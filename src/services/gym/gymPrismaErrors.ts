import { GymError } from './GymError';

/** Converte violação de unicidade do Prisma (P2002) em mensagem amigável. */
export function rethrowUnique(error: unknown, messages: Record<string, string>): never {
    const e = error as { code?: string; meta?: { target?: unknown } };
    if (e?.code === 'P2002') {
        const target = JSON.stringify(e.meta?.target ?? '');
        for (const [field, msg] of Object.entries(messages)) {
            if (target.includes(field)) throw new GymError(msg, 409, 'DUPLICATE');
        }
        throw new GymError('Já existe um cadastro com esses dados.', 409, 'DUPLICATE');
    }
    throw error;
}
