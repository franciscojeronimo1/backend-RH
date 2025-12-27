import { prismaClient } from '../../config/prismaClient';

class ListUsersService {
    async execute(userRole: string, userId?: string) {
        // STAFF só vê seus próprios dados e os STAFF que ele criou (se houver)
        // ADMIN vê todos os usuários
        if (userRole === 'STAFF' && userId) {
            const users = await prismaClient.user.findMany({
                where: {
                    OR: [
                        { id: userId }, // Próprio usuário
                        { createdById: userId }, // STAFF criados por ele (se for ADMIN que virou STAFF)
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdById: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            return users;
        }

        // ADMIN vê todos os usuários com relação
        const users = await prismaClient.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return users;
    }
}

export { ListUsersService };

