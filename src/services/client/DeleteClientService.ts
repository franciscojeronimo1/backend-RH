import { prismaClient } from '../../config/prismaClient';

class DeleteClientService {
    async execute(id: string, organizationId: string) {
        const client = await prismaClient.client.findFirst({
            where: { id, organizationId },
            select: { id: true },
        });

        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        await prismaClient.client.delete({
            where: { id },
        });

        return { message: 'Cliente excluído com sucesso' };
    }
}

export { DeleteClientService };
