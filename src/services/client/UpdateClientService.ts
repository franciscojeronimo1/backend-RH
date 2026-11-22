import { prismaClient } from '../../config/prismaClient';

export interface UpdateClientData {
    name?: string;
    cpf?: string;
    phone?: string;
    email?: string | null;
    street?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    addressReference?: string | null;
    notes?: string | null;
    active?: boolean;
}

class UpdateClientService {
    async execute(id: string, organizationId: string, data: UpdateClientData) {
        const existing = await prismaClient.client.findFirst({
            where: { id, organizationId },
        });

        if (!existing) {
            throw new Error('Cliente não encontrado');
        }

        if (data.cpf && data.cpf !== existing.cpf) {
            const duplicate = await prismaClient.client.findFirst({
                where: {
                    organizationId,
                    cpf: data.cpf,
                    NOT: { id },
                },
                select: { id: true },
            });
            if (duplicate) {
                throw new Error('Já existe um cliente com este CPF nesta organização');
            }
        }

        const updateData: Record<string, unknown> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.cpf !== undefined) updateData.cpf = data.cpf;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.street !== undefined) updateData.street = data.street;
        if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.state !== undefined) updateData.state = data.state;
        if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
        if (data.addressReference !== undefined) updateData.addressReference = data.addressReference;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.active !== undefined) updateData.active = data.active;

        const client = await prismaClient.client.update({
            where: { id },
            data: updateData,
        });

        return client;
    }
}

export { UpdateClientService };
