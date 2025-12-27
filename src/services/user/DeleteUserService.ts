import { prismaClient } from '../../config/prismaClient';

class DeleteUserService {
    async execute(id: string, currentUserId: string) {
        // Não permitir que ADMIN delete a si mesmo
        if (id === currentUserId) {
            throw new Error('Você não pode deletar sua própria conta');
        }

        const user = await prismaClient.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        await prismaClient.user.delete({
            where: { id },
        });

        return { message: 'Usuário deletado com sucesso' };
    }
}

export { DeleteUserService };

