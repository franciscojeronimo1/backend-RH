import bcrypt from 'bcrypt';
import { prismaClient } from '../../config/prismaClient';
import { generateToken } from '../../utils/generateToken';

import { Role } from '../../../generated/prisma/enums';

class CreateUserService {
    async execute(name: string, email: string, password: string, organizationName?: string) {
        const existingUser = await prismaClient.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('Email já está em uso');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const orgName = organizationName || `${name} - Empresa`;

        const organization = await prismaClient.organization.create({
            data: {
                name: orgName,
            },
        });

        const user = await prismaClient.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.ADMIN,
                organizationId: organization.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                organizationId: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            user,
            organization: {
                id: organization.id,
                name: organization.name,
            },
            token,
        };
    }
}

export { CreateUserService };