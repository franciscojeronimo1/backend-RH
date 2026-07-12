import { prismaClient } from '../../config/prismaClient';

class GetBookletByIdService {
    async execute(id: string, organizationId: string) {
        const booklet = await prismaClient.booklet.findFirst({
            where: { id, organizationId },
            include: {
                client: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        cnpj: true,
                        email: true,
                        phone: true,
                        address: true,
                    },
                },
                parcels: {
                    orderBy: { number: 'asc' },
                },
            },
        });

        if (!booklet) {
            throw new Error('Carnê não encontrado');
        }

        return booklet;
    }
}

export { GetBookletByIdService };
