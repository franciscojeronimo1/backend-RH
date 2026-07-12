import { z } from 'zod';

const dueDateField = z
    .string()
    .min(1, { message: 'A data do primeiro vencimento é obrigatória' })
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), {
        message: 'Data inválida (use YYYY-MM-DD)',
    });

export const createBookletSchema = z.object({
    body: z.object({
        clientId: z.string().uuid({ message: 'Cliente inválido' }),
        description: z
            .string()
            .optional()
            .nullable()
            .transform((v) => {
                if (v === undefined || v === null) return undefined;
                const t = v.trim();
                return t === '' ? undefined : t;
            }),
        notes: z
            .string()
            .optional()
            .nullable()
            .transform((v) => {
                if (v === undefined || v === null) return undefined;
                const t = v.trim();
                return t === '' ? undefined : t;
            }),
        installmentCount: z.coerce
            .number()
            .int({ message: 'Quantidade de parcelas deve ser inteira' })
            .min(1, { message: 'Mínimo de 1 parcela' })
            .max(48, { message: 'Máximo de 48 parcelas' }),
        installmentAmount: z.coerce
            .number()
            .positive({ message: 'Valor da parcela deve ser positivo' }),
        firstDueDate: dueDateField,
    }),
});

export const updateBookletParcelSchema = z.object({
    body: z.object({
        status: z.enum(['PENDING', 'PAID', 'CANCELLED'], {
            message: 'Status inválido',
        }),
    }),
});

export type CreateBookletSchema = z.infer<typeof createBookletSchema>;
export type UpdateBookletParcelSchema = z.infer<typeof updateBookletParcelSchema>;
