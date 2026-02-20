import { prismaClient } from '../../config/prismaClient';

class ListCategoriesService {
    async execute(organizationId: string) {
        const categories = await prismaClient.category.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: 'asc' },
        });

        return { categories };
    }
}

export { ListCategoriesService };
