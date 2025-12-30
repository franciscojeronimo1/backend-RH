import { z } from 'zod';

export const updateOrganizationSchema = z.object({
    body: z.object({
        name: z.string().min(1, { message: "O nome da organização é obrigatório" }).optional(),
        cnpj: z.string().optional().nullable(),
        email: z.string().email({ message: "Email inválido" }).optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
    }),
});

export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>;

