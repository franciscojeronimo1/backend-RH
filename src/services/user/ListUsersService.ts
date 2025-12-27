import { prismaClient } from '../../config/prismaClient';

class ListUsersService {
    async execute() {
        const users = await prismaClient.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
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

