import { prismaClient } from '../../config/prismaClient';

export interface CreateClientData {
    name: string;
    cpf: string;
    phone: string;
    email?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    addressReference?: string;
    notes?: string;
    active?: boolean;
}

class CreateClientService {
    async execute(organizationId: string, data: CreateClientData) {
        const existing = await prismaClient.client.findFirst({
            where: {
                organizationId,
                cpf: data.cpf,
            },
            select: { id: true },
        });

        if (existing) {
            throw new Error('Já existe um cliente com este CPF nesta organização');
        }

        const client = await prismaClient.client.create({
            data: {
                organizationId,
                name: data.name,
                cpf: data.cpf,
                phone: data.phone,
                email: data.email ?? null,
                street: data.street ?? null,
                neighborhood: data.neighborhood ?? null,
                city: data.city ?? null,
                state: data.state ?? null,
                zipCode: data.zipCode ?? null,
                addressReference: data.addressReference ?? null,
                notes: data.notes ?? null,
                active: data.active ?? true,
            },
        });

        return client;
    }
}

export { CreateClientService };
