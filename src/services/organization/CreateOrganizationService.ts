import { prismaClient } from '../../config/prismaClient';

class CreateOrganizationService {
    async execute(name: string, userId: string, cnpj?: string, email?: string, phone?: string, address?: string) {
        const organization = await prismaClient.organization.create({
            data: {
                name,
                cnpj,
                email,
                phone,
                address,
            },
        });

        await prismaClient.subscription.create({
            data: {
                organizationId: organization.id,
                plan: 'FREE',
                status: 'ACTIVE',
            },
        });

        await prismaClient.user.update({
            where: { id: userId },
            data: {
                organizationId: organization.id,
            },
        });

        return organization;
    }
}

export { CreateOrganizationService };


