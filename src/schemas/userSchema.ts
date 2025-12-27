import { z } from 'zod';

export const createUserSchema = z.object({
    body: z.object({
        name: z.string().min(3, { message: "O nome precisa ter no mínimo 3 caracteres"}),
        email: z.email({ message: "O email precisa ser válido"}),
        password: z.string().min(6, { message: "A senha precisa ter no mínimo 6 caracteres"}),
    }),
});

export const createStaffSchema = z.object({
    body: z.object({
        name: z.string().min(3, { message: "O nome precisa ter no mínimo 3 caracteres"}),
        email: z.email({ message: "O email precisa ser válido"}),
        password: z.string().min(6, { message: "A senha precisa ter no mínimo 6 caracteres"}),
    }),
});

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string().min(3, { message: "O nome precisa ter no mínimo 3 caracteres"}).optional(),
        email: z.email({ message: "O email precisa ser válido"}).optional(),
        password: z.string().min(6, { message: "A senha precisa ter no mínimo 6 caracteres"}).optional(),
        role: z.enum(['STAFF', 'ADMIN'], { message: "O role deve ser STAFF ou ADMIN"}).optional(),
    }),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;