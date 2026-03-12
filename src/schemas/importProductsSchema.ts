import { z } from 'zod';

export const importProductsMappingSchema = z.object({
    name: z.string().min(1, { message: 'O mapeamento do campo "name" (nome) é obrigatório' }),
    quantity: z.string().min(1, { message: 'O mapeamento do campo "quantity" (quantidade) é obrigatório' }),
    unitPrice: z.string().min(1, { message: 'O mapeamento do campo "unitPrice" (preço unitário) é obrigatório' }),
    code: z.string().optional(),
    sku: z.string().optional(),
    category: z.string().optional(),
    minStock: z.string().optional(),
    unit: z.string().optional(),
    costPrice: z.string().optional(),
    salePrice: z.string().optional(),
    supplierName: z.string().optional(),
    supplierDoc: z.string().optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
});

export const importProductsSchema = z.object({
    body: z.object({
        file: z.string().min(1, { message: 'O arquivo em base64 é obrigatório' }),
        mapping: z.object({
            name: z.string().min(1, { message: 'O mapeamento do campo "name" (nome) é obrigatório' }),
            quantity: z.string().min(1, { message: 'O mapeamento do campo "quantity" (quantidade) é obrigatório' }),
            unitPrice: z.string().min(1, { message: 'O mapeamento do campo "unitPrice" (preço unitário) é obrigatório' }),
            code: z.string().optional(),
            sku: z.string().optional(),
            category: z.string().optional(),
            minStock: z.string().optional(),
            unit: z.string().optional(),
            costPrice: z.string().optional(),
            salePrice: z.string().optional(),
            supplierName: z.string().optional(),
            supplierDoc: z.string().optional(),
            invoiceNumber: z.string().optional(),
            notes: z.string().optional(),
        }),
    }),
});

export type ImportProductsMappingSchema = z.infer<typeof importProductsMappingSchema>;
