import { prismaClient } from '../../config/prismaClient';

class GetClientByIdService {
    async execute(id: string, organizationId: string) {
        const client = await prismaClient.client.findFirst({
            where: {
                id,
                organizationId,
            },
        });

        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        return client;
    }
}

export { GetClientByIdService };
