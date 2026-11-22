import { z } from 'zod';

const days = (min: number, max: number) =>
    z.number().int({ message: 'Use um número inteiro' }).min(min, { message: `Mínimo ${min}` }).max(max, { message: `Máximo ${max}` });

export const updateGymSettingsSchema = z.object({
    body: z
        .object({
            atRiskAfterDays: days(1, 180).optional(),
            inactiveAfterDays: days(2, 365).optional(),
            autoDeactivate: z.boolean().optional(),
            autoReactivateOnCheckIn: z.boolean().optional(),
            planExpiringNoticeDays: days(0, 60).optional(),
            deactivateOnPlanExpired: z.boolean().optional(),
            planExpiredGraceDays: days(0, 90).optional(),
            notifyAtRisk: z.boolean().optional(),
        })
        .strict(),
});

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato AAAA-MM-DD' });

/** Texto opcional: '' ou só espaços vira null. */
const optionalText = (max: number) =>
    z
        .string()
        .max(max, { message: `Máximo ${max} caracteres` })
        .nullable()
        .optional()
        .transform((v) => (v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim()));

const optionalDigits = (min: number, max: number, label: string) =>
    z
        .string()
        .nullable()
        .optional()
        .transform((v) => (v === undefined ? undefined : v === null ? null : v.replace(/\D/g, '') || null))
        .refine((v) => v === undefined || v === null || (v.length >= min && v.length <= max), {
            message: `${label} deve ter de ${min} a ${max} dígitos`,
        });

const memberFields = {
    cpf: optionalDigits(11, 11, 'CPF'),
    phone: optionalDigits(10, 13, 'Telefone'),
    email: z
        .union([z.string().trim().email({ message: 'Email inválido' }), z.literal(''), z.null()])
        .optional()
        .transform((v) => (v === '' ? null : v)),
    birthDate: z
        .union([ymd, z.literal(''), z.null()])
        .optional()
        .transform((v) => (v === '' ? null : v)),
    notes: optionalText(1000),
    /** Senha numérica da catraca. Vazio no cadastro = o sistema gera uma. */
    accessCode: optionalDigits(4, 8, 'Senha da catraca'),
    autoControl: z.boolean().optional(),
};

export const createGymMemberSchema = z.object({
    body: z
        .object({
            name: z.string().trim().min(2, { message: 'Informe o nome do aluno' }).max(120),
            ...memberFields,
            /** Matrícula inicial opcional */
            planId: z.string().min(1).optional(),
            startDate: ymd.optional(),
        })
        .strict(),
});

export const updateGymMemberSchema = z.object({
    body: z
        .object({
            name: z.string().trim().min(2, { message: 'Informe o nome do aluno' }).max(120).optional(),
            ...memberFields,
        })
        .strict(),
});

export const createCheckInSchema = z.object({
    body: z
        .object({
            memberId: z.string().min(1, { message: 'Informe o aluno' }),
        })
        .strict(),
});

export const createMembershipSchema = z.object({
    body: z
        .object({
            /** Plano cadastrado; ou então planName + price + endDate para um plano avulso */
            planId: z.string().min(1).optional(),
            planName: z.string().trim().min(1).max(80).optional(),
            price: z.number().min(0).max(100000).optional(),
            startDate: ymd.optional(),
            endDate: ymd.optional(),
            /** Já registra a primeira mensalidade como paga */
            paid: z.boolean().optional(),
            paymentMethod: z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER']).optional(),
            notes: optionalText(500),
        })
        .strict()
        .refine((b) => b.planId || (b.planName && b.price !== undefined && b.endDate), {
            message: 'Escolha um plano ou informe nome, valor e vencimento',
        }),
});

export const payPaymentSchema = z.object({
    body: z
        .object({
            method: z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER']),
            amount: z.number().min(0).max(100000).optional(),
        })
        .strict(),
});

const planBody = {
    name: z.string().trim().min(1, { message: 'Informe o nome do plano' }).max(80),
    description: optionalText(300),
    price: z.number().min(0).max(100000),
    durationMonths: z.number().int().min(0).max(36),
    durationDays: z.number().int().min(0).max(365),
    active: z.boolean(),
};

const hasDuration = (b: { durationMonths?: number; durationDays?: number }) =>
    b.durationMonths === undefined && b.durationDays === undefined
        ? true
        : (b.durationMonths ?? 0) + (b.durationDays ?? 0) > 0;

export const createMembershipPlanSchema = z.object({
    body: z
        .object({
            ...planBody,
            durationMonths: planBody.durationMonths.default(1),
            durationDays: planBody.durationDays.default(0),
            active: planBody.active.default(true),
        })
        .strict()
        .refine(hasDuration, { message: 'O plano precisa ter duração (meses ou dias)' }),
});

export const updateMembershipPlanSchema = z.object({
    body: z
        .object({
            name: planBody.name.optional(),
            description: planBody.description,
            price: planBody.price.optional(),
            durationMonths: planBody.durationMonths.optional(),
            durationDays: planBody.durationDays.optional(),
            active: planBody.active.optional(),
        })
        .strict(),
});
