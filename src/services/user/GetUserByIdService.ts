import { prismaClient } from '../../config/prismaClient';

class GetUserByIdService {
    async execute(id: string) {
        const user = await prismaClient.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        return user;
    }
}

export { GetUserByIdService };

