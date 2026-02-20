import { prismaClient } from '../../config/prismaClient';

class UpdateCategoryService {
    async execute(id: string, organizationId: string, name: string) {
        const category = await prismaClient.category.findFirst({
            where: { id, organizationId },
        });

        if (!category) {
            throw new Error('Categoria não encontrada');
        }

        const trimmedName = name.trim();
        const existingWithName = await prismaClient.category.findFirst({
            where: {
                organizationId,
                name: trimmedName,
                id: { not: id },
            },
        });

        if (existingWithName) {
            throw new Error('Já existe uma categoria com este nome');
        }

        const updated = await prismaClient.category.update({
            where: { id },
            data: { name: trimmedName },
            select: { id: true, name: true },
        });

        return { category: updated };
    }
}

export { UpdateCategoryService };
