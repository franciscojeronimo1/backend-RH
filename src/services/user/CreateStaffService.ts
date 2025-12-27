import bcrypt from 'bcrypt';
import { prismaClient } from '../../config/prismaClient';
import { generateToken } from '../../utils/generateToken';

import { Role } from '../../../generated/prisma/enums';

class CreateStaffService {
    //Cria um novo usuário STAFF vinculado ao ADMIN que está criando
     
    async execute(adminId: string, name: string, email: string, password: string) {
        const admin = await prismaClient.user.findUnique({
            where: { id: adminId }
        });

        if (!admin) {
            throw new Error('Administrador não encontrado');
        }

        if (admin.role !== Role.ADMIN) {
            throw new Error('Apenas administradores podem criar usuários STAFF');
        }

        const existingUser = await prismaClient.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('Email já está em uso');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Criar STAFF vinculado ao ADMIN
        const staff = await prismaClient.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.STAFF,
                createdById: adminId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        const token = generateToken({
            id: staff.id,
            email: staff.email,
            role: staff.role,
        });

        return {
            user: staff,
            token,
        };
    }
}

export { CreateStaffService };

