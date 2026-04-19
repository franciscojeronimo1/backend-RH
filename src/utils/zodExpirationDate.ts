import { z } from 'zod';

export type ExpirationDateFieldMode = 'create' | 'update';

function normalizeExpirationInput(value: unknown, mode: ExpirationDateFieldMode): unknown {
    if (value === undefined) return undefined;
    if (value === null || value === '') return mode === 'update' ? null : undefined;
    if (value === 0 || value === '0') return mode === 'update' ? null : undefined;
    if (typeof value === 'number' && !Number.isFinite(value)) {
        return mode === 'update' ? null : undefined;
    }
    return value;
}

/**
 * Schema Zod reutilizável para validade de produto.
 * Evita persistir 01/01/1970 quando o cliente envia 0, string vazia ou epoch no lugar de "sem data".
 */
export function zodExpirationDateField(mode: ExpirationDateFieldMode) {
    return z.preprocess(
        (value) => normalizeExpirationInput(value, mode),
        z
            .union([z.coerce.date(), z.null()])
            .optional()
            .transform((date) => {
                if (date === null || date === undefined) return date;
                const ms = date.getTime();
                if (Number.isNaN(ms) || ms === 0) {
                    return mode === 'update' ? null : undefined;
                }
                return date;
            })
    );
}
