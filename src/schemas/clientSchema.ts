import { z } from 'zod';
import { digitsOnlyCpf, isValidCpf } from '../utils/cpf';

function emptyToUndefined(v: string | null | undefined): string | undefined {
    if (v === undefined || v === null) return undefined;
    const t = v.trim();
    return t === '' ? undefined : t;
}

function emptyToNull(v: string | null | undefined): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t === '' ? null : t;
}

const cpfField = z
    .string()
    .min(1, { message: 'O CPF é obrigatório' })
    .transform(digitsOnlyCpf)
    .refine(isValidCpf, { message: 'CPF inválido' });

const phoneField = z
    .string()
    .min(1, { message: 'O telefone é obrigatório' })
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 10 && v.length <= 11, {
        message: 'Telefone deve ter 10 ou 11 dígitos',
    });

const optionalEmail = z
    .string()
    .optional()
    .nullable()
    .transform(emptyToUndefined)
    .refine(
        (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        { message: 'E-mail inválido' }
    );

const optionalEmailUpdate = z
    .string()
    .optional()
    .nullable()
    .transform(emptyToNull)
    .refine(
        (v) => v === undefined || v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        { message: 'E-mail inválido' }
    );

const optionalText = z.string().optional().nullable().transform(emptyToUndefined);

const optionalTextUpdate = z.string().optional().nullable().transform(emptyToNull);

const stateField = z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
        const t = emptyToUndefined(v);
        return t ? t.toUpperCase() : undefined;
    })
    .refine((v) => v === undefined || v.length === 2, {
        message: 'UF deve ter 2 caracteres',
    });

const stateFieldUpdate = z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
        const t = emptyToNull(v);
        return t === null || t === undefined ? t : t.toUpperCase();
    })
    .refine((v) => v === undefined || v === null || v.length === 2, {
        message: 'UF deve ter 2 caracteres',
    });

const zipCodeField = z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
        const t = emptyToUndefined(v);
        return t ? t.replace(/\D/g, '') : undefined;
    })
    .refine((v) => v === undefined || v.length === 8, {
        message: 'CEP deve ter 8 dígitos',
    });

const zipCodeFieldUpdate = z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
        const t = emptyToNull(v);
        if (t === null || t === undefined) return t;
        return t.replace(/\D/g, '');
    })
    .refine((v) => v === undefined || v === null || v.length === 8, {
        message: 'CEP deve ter 8 dígitos',
    });

export const createClientSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: 'O nome é obrigatório' }).transform((v) => v.trim()),
        cpf: cpfField,
        phone: phoneField,
        email: optionalEmail,
        street: optionalText,
        neighborhood: optionalText,
        city: optionalText,
        state: stateField,
        zipCode: zipCodeField,
        addressReference: optionalText,
        notes: optionalText,
        active: z.boolean().optional().default(true),
    }),
});

export const updateClientSchema = z.object({
    body: z.object({
        name: z
            .string()
            .min(1, { message: 'O nome é obrigatório' })
            .transform((v) => v.trim())
            .optional(),
        cpf: cpfField.optional(),
        phone: phoneField.optional(),
        email: optionalEmailUpdate,
        street: optionalTextUpdate,
        neighborhood: optionalTextUpdate,
        city: optionalTextUpdate,
        state: stateFieldUpdate,
        zipCode: zipCodeFieldUpdate,
        addressReference: optionalTextUpdate,
        notes: optionalTextUpdate,
        active: z.boolean().optional(),
    }),
});

export type CreateClientSchema = z.infer<typeof createClientSchema>;
export type UpdateClientSchema = z.infer<typeof updateClientSchema>;
