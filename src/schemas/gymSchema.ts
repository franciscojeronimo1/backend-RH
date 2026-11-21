import { z } from 'zod';

const days = (min: number, max: number) =>
    z.number().int({ message: 'Use um número inteiro' }).min(min, { message: `Mínimo ${min}` }).max(max, { message: `Máximo ${max}` });

export const updateGymSettingsSchema = z.object({
    body: z
        .object({
            enabled: z.boolean().optional(),
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

const ymd = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato AAAA-MM-DD' });

export const updateGymMemberSchema = z.object({
    body: z
        .object({
            planName: z
                .string()
                .max(80)
                .nullable()
                .optional()
                .transform((v) => (v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim())),
            planExpiresAt: z
                .union([ymd, z.literal(''), z.null()])
                .optional()
                .transform((v) => (v === '' ? null : v)),
            autoControl: z.boolean().optional(),
        })
        .strict(),
});

export const createCheckInSchema = z.object({
    body: z.object({
        clientId: z.string().min(1, { message: 'Informe o aluno' }),
    }),
});
