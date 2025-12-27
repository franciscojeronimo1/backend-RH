import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.email({ message: "O email precisa ser válido"}),
        password: z.string().min(1, { message: "A senha é obrigatória"}),
    }),
});

export type LoginSchema = z.infer<typeof loginSchema>;

