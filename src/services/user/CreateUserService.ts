import bcrypt from 'bcrypt';
import { prismaClient } from '../../config/prismaClient';
import { generateToken } from '../../utils/generateToken';

class CreateUserService {
    async execute(name: string, email: string, password: string) {
        const existingUser = await prismaClient.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('Email já está em uso');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await prismaClient.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
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
            token,
        };
    }
}

export { CreateUserService };