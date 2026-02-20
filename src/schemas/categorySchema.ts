import { z } from 'zod';

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: 'O nome da categoria é obrigatório' }),
    }),
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: 'O nome da categoria é obrigatório' }),
    }),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;
