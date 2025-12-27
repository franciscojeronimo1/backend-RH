import { prismaClient } from '../../config/prismaClient';

class GetUserByIdService {
    async execute(id: string, currentUserId?: string, currentUserRole?: string) {
        const user = await prismaClient.user.findUnique({
            where: { id },
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

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        if (currentUserRole === 'STAFF' && user.id !== currentUserId) {
            throw new Error('Você não tem permissão para visualizar este usuário');
        }

        return user;
    }
}

export { GetUserByIdService };

