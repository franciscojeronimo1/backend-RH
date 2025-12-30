import bcrypt from 'bcrypt';
import { prismaClient } from '../../config/prismaClient';
import { generateToken } from '../../utils/generateToken';

class LoginService {
    async execute(email: string, password: string) {
        const user = await prismaClient.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                organizationId: true,
            },
        });

        // Sempre verificar senha mesmo se usuário não existir (proteção contra timing attacks)
        // Isso previne que atacantes descubram quais emails existem no sistema
        let passwordMatch = false;
        
        if (user) {
            passwordMatch = await bcrypt.compare(password, user.password);
        } else {
            // Comparar com hash fictício para manter tempo de resposta similar
            await bcrypt.compare(password, '$2b$10$dummyhashheretopreventtimingattacks');
        }

        if (!user || !passwordMatch) {
            throw new Error('Email ou senha incorretos');
        }

        // Buscar organização do usuário
        const organization = user.organizationId ? await prismaClient.organization.findUnique({
            where: { id: user.organizationId },
            select: {
                id: true,
                name: true,
            },
        }) : null;

        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            },
            organization: organization ? {
                id: organization.id,
                name: organization.name,
            } : null,
            token,
        };
    }
}

export { LoginService };

