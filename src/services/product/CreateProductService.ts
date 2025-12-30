import { prismaClient } from '../../config/prismaClient';

class CreateProductService {
    async execute(
        organizationId: string,
        name: string,
        code?: string,
        sku?: string,
        category?: string,
        minStock: number = 0,
        unit: string = 'UN',
        costPrice?: number
    ) {
        const product = await prismaClient.product.create({
            data: {
                organizationId,
                name,
                code,
                sku,
                category,
                minStock,
                unit,
                costPrice: costPrice ? costPrice : null,
                averageCost: costPrice ? costPrice : null,
                currentStock: 0,
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return product;
    }
}

export { CreateProductService };


