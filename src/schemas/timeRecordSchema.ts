import { z } from 'zod';

// Schema para query params de listagem (opcional)
export const listTimeRecordsQuerySchema = z.object({
    query: z.object({
        userId: z.string().uuid().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data deve estar no formato YYYY-MM-DD" }).optional(),
        periodDays: z.coerce.number().int().min(1).max(366).optional(),
        month: z.string().regex(/^\d{4}-\d{2}$/, { message: "Mês deve estar no formato YYYY-MM" }).optional(),
    }),
});

export type ListTimeRecordsQuerySchema = z.infer<typeof listTimeRecordsQuerySchema>;

