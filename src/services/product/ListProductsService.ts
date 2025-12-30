import { prismaClient } from '../../config/prismaClient';

class ListProductsService {
    async execute(organizationId: string, category?: string, includeInactive: boolean = false) {
        const where: any = {
            organizationId,
        };

        if (category) {
            where.category = category;
        }

        if (!includeInactive) {
            where.active = true;
        }

        const products = await prismaClient.product.findMany({
            where,
            orderBy: {
                name: 'asc',
            },
        });

        return products;
    }
}

export { ListProductsService };


