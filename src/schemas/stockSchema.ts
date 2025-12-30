import { z } from 'zod';

export const createStockEntrySchema = z.object({
    body: z.object({
        productId: z.string().uuid({ message: "ID do produto inválido" }),
        quantity: z.number().int().positive({ message: "Quantidade deve ser um número inteiro positivo" }),
        unitPrice: z.number().positive({ message: "Preço unitário deve ser positivo" }),
        supplierName: z.string().optional(),
        supplierDoc: z.string().optional(),
        invoiceNumber: z.string().optional(),
        notes: z.string().optional(),
    }),
});

export const createStockExitSchema = z.object({
    body: z.object({
        productId: z.string().uuid({ message: "ID do produto inválido" }),
        quantity: z.number().int().positive({ message: "Quantidade deve ser um número inteiro positivo" }),
        projectName: z.string().optional(),
        clientName: z.string().optional(),
        serviceType: z.string().optional(),
        notes: z.string().optional(),
    }),
});

export const createOrganizationSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: "O nome da organização é obrigatório" }),
        cnpj: z.string().optional(),
        email: z.string().email({ message: "Email inválido" }).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
    }),
});

export type CreateStockEntrySchema = z.infer<typeof createStockEntrySchema>;
export type CreateStockExitSchema = z.infer<typeof createStockExitSchema>;
export type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>;


