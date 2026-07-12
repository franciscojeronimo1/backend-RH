import { prismaClient } from '../../config/prismaClient';

class DeleteBookletService {
    async execute(id: string, organizationId: string) {
        const booklet = await prismaClient.booklet.findFirst({
            where: { id, organizationId },
            select: { id: true },
        });

        if (!booklet) {
            throw new Error('Carnê não encontrado');
        }

        await prismaClient.booklet.delete({ where: { id } });

        return { message: 'Carnê excluído com sucesso' };
    }
}

export { DeleteBookletService };
