import { prismaClient } from '../../config/prismaClient';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface PaginationParams {
    page?: number;
    limit?: number;
}

interface PaginatedResult {
    products: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
class ListProductsService {
    async execute(
        organizationId: string,
        category?: string,
        includeInactive: boolean = false,
        paginationParams?: PaginationParams,
        search?: string,
        supplier?: string
    ): Promise<PaginatedResult> {
        const where: any = {
            organizationId,
        };

        if (category) {
            where.category = category;
        }

        if (!includeInactive) {
            where.active = true;
        }

        const andConditions: any[] = [];

        if (supplier?.trim()) {
            andConditions.push({
                OR: [
                    { supplierName: { contains: supplier.trim(), mode: 'insensitive' } },
                    { supplierDoc: { contains: supplier.trim(), mode: 'insensitive' } },
                ],
            });
        }

        const searchTerm = search?.trim();
        if (searchTerm) {
            andConditions.push({
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { code: { contains: searchTerm, mode: 'insensitive' } },
                    { sku: { contains: searchTerm, mode: 'insensitive' } },
                ],
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const page = Math.max(1, paginationParams?.page ?? DEFAULT_PAGE);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, paginationParams?.limit ?? DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prismaClient.product.findMany({
                where,
                orderBy: {
                    name: 'asc',
                },
                skip,
                take: limit,
            }),
            prismaClient.product.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            products,
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

export { ListProductsService };


