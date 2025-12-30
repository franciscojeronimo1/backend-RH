import { prismaClient } from '../../config/prismaClient';

class GetOrganizationService {
    async execute(organizationId: string) {
        const organization = await prismaClient.organization.findUnique({
            where: { id: organizationId },
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                    },
                },
            },
        });

        if (!organization) {
            throw new Error('Organização não encontrada');
        }

        return organization;
    }
}

export { GetOrganizationService };

