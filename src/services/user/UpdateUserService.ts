import bcrypt from 'bcrypt';
import { prismaClient } from '../../config/prismaClient';

interface UpdateUserData {
    name?: string;
    email?: string;
    password?: string;
    role?: 'STAFF' | 'ADMIN';
}

class UpdateUserService {
    async execute(id: string, data: UpdateUserData) {
        // Verificar se o usuário existe
        const existingUser = await prismaClient.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new Error('Usuário não encontrado');
        }

        // Se o email está sendo alterado, verificar se já existe
        if (data.email && data.email !== existingUser.email) {
            const emailExists = await prismaClient.user.findUnique({
                where: { email: data.email },
            });

            if (emailExists) {
                throw new Error('Email já está em uso');
            }
        }

        // Preparar dados para atualização
        const updateData: any = {};

        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;
        if (data.role) updateData.role = data.role;

        // Hash da senha se fornecida
        if (data.password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(data.password, saltRounds);
        }

        // Atualizar usuário
        const user = await prismaClient.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }
}

export { UpdateUserService };

