import bcrypt from 'bcrypt';
import { prismaClient } from '../../config/prismaClient';

interface UpdateUserData {
    name?: string;
    email?: string;
    password?: string;
    role?: 'STAFF' | 'ADMIN';
}

class UpdateUserService {
    async execute(id: string, data: UpdateUserData, currentUserId: string, currentUserRole: string) {
        // Verificar se o usuário existe
        const existingUser = await prismaClient.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new Error('Usuário não encontrado');
        }

        // STAFF só pode atualizar seus próprios dados e não pode mudar role
        if (currentUserRole === 'STAFF') {
            if (id !== currentUserId) {
                throw new Error('Você só pode atualizar seus próprios dados');
            }
            // STAFF não pode mudar seu próprio role
            if (data.role) {
                throw new Error('Você não tem permissão para alterar o role');
            }
        }

        // ADMIN não pode mudar role de outros usuários (apenas via banco ou lógica específica)
        // Mas pode atualizar qualquer campo de qualquer usuário
        if (currentUserRole === 'ADMIN' && data.role && id !== currentUserId) {

             throw new Error('Não é possível alterar role de outros usuários');
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
        if (data.role && currentUserRole === 'ADMIN') updateData.role = data.role;

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
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }
}

export { UpdateUserService };

