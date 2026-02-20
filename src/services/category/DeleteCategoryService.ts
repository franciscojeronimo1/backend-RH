import { prismaClient } from '../../config/prismaClient';

class DeleteCategoryService {
    async execute(id: string, organizationId: string) {
        const category = await prismaClient.category.findFirst({
            where: { id, organizationId },
        });

        if (!category) {
            throw new Error('Categoria não encontrada');
        }

        await prismaClient.category.delete({
            where: { id },
        });

        return { message: 'Categoria excluída com sucesso' };
    }
}

export { DeleteCategoryService };
