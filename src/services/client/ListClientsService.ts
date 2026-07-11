import { prismaClient } from '../../config/prismaClient';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface PaginationParams {
    page?: number;
    limit?: number;
}

class ListClientsService {
    async execute(
        organizationId: string,
        includeInactive: boolean = false,
        paginationParams?: PaginationParams,
        search?: string
    ) {
        const where: Record<string, unknown> = {
            organizationId,
        };

        if (!includeInactive) {
            where.active = true;
        }

        const searchTerm = search?.trim();
        if (searchTerm) {
            const digits = searchTerm.replace(/\D/g, '');
            const orConditions: Record<string, unknown>[] = [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: digits || searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { city: { contains: searchTerm, mode: 'insensitive' } },
            ];
            if (digits.length > 0) {
                orConditions.push({ cpf: { contains: digits } });
            }
            where.OR = orConditions;
        }

        const page = Math.max(1, paginationParams?.page ?? DEFAULT_PAGE);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, paginationParams?.limit ?? DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;

        const [clients, total] = await Promise.all([
            prismaClient.client.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            prismaClient.client.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            clients,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }
}

export { ListClientsService };
