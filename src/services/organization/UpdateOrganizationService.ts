import { prismaClient } from '../../config/prismaClient';

interface UpdateOrganizationData {
    name?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    address?: string;
}

class UpdateOrganizationService {
    async execute(organizationId: string, data: UpdateOrganizationData) {
        const organization = await prismaClient.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new Error('Organização não encontrada');
        }

        const updateData: any = {};

        if (data.name) updateData.name = data.name;
        if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.address !== undefined) updateData.address = data.address;

        const updatedOrganization = await prismaClient.organization.update({
            where: { id: organizationId },
            data: updateData,
        });

        return updatedOrganization;
    }
}

export { UpdateOrganizationService };

