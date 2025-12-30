import { prismaClient } from '../../config/prismaClient';

class GetProductByIdService {
    async execute(id: string, organizationId: string) {
        const product = await prismaClient.product.findFirst({
            where: {
                id,
                organizationId,
            },
        });

        if (!product) {
            throw new Error('Produto não encontrado');
        }

        return product;
    }
}

export { GetProductByIdService };


