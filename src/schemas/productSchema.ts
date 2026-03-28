import { z } from 'zod';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: "O nome do produto é obrigatório" }),
        code: z.string().optional(),
        sku: z.string().optional(),
        category: z.string().optional(),
        minStock: z.number().int().min(0, { message: "Estoque mínimo deve ser maior ou igual a 0" }).default(0),
        unit: z.string().min(1, { message: "A unidade é obrigatória" }).default("UN"),
        costPrice: z.number().positive({ message: "Preço de custo deve ser positivo" }).optional(),
        salePrice: z.number().positive({ message: "Preço de venda deve ser positivo" }).optional(),
        active: z.boolean().optional().default(true),
        supplierName: z.string().optional(),
        supplierDoc: z.string().optional(),
        expirationDate: z.preprocess(
            (v) => (v == null || v === '' ? undefined : v),
            z.coerce.date().optional()
        ),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: "O nome do produto é obrigatório" }).optional(),
        code: z.string().optional(),
        sku: z.string().optional(),
        category: z.string().optional(),
        minStock: z.number().int().min(0).optional(),
        currentStock: z.number().int().min(0, { message: "Estoque atual deve ser maior ou igual a 0" }).optional(),
        unit: z.string().min(1).optional(),
        costPrice: z.number().positive().optional(),
        salePrice: z.number().positive().optional(),
        active: z.boolean().optional(),
        supplierName: z.string().optional().nullable(),
        supplierDoc: z.string().optional().nullable(),
        expirationDate: z.preprocess(
            (v) => {
                if (v === undefined) return undefined;
                if (v === null || v === '') return null;
                return v;
            },
            z.union([z.coerce.date(), z.null()]).optional()
        ),
    }),
});

export type CreateProductSchema = z.infer<typeof createProductSchema>;
export type UpdateProductSchema = z.infer<typeof updateProductSchema>;


