import { prismaClient } from '../../config/prismaClient';

class CreateCategoryService {
    async execute(organizationId: string, name: string) {
        const trimmedName = name.trim();
        const existing = await prismaClient.category.findFirst({
            where: { organizationId, name: trimmedName },
            select: { id: true, name: true },
        });
        if (existing) {
            return { category: existing };
        }

        const category = await prismaClient.category.create({
            data: {
                organizationId,
                name: trimmedName,
            },
            select: {
                id: true,
                name: true,
            },
        });

        return { category };
    }
}

export { CreateCategoryService };
