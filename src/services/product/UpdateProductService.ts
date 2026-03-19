import { prismaClient } from '../../config/prismaClient';

interface UpdateProductData {
    name?: string;
    code?: string;
    sku?: string;
    category?: string;
    minStock?: number;
    currentStock?: number;
    unit?: string;
    costPrice?: number;
    salePrice?: number;
    active?: boolean;
    supplierName?: string | null;
    supplierDoc?: string | null;
}

class UpdateProductService {
    async execute(id: string, organizationId: string, data: UpdateProductData) {
        // Verificar se produto existe e pertence à organização
        const existingProduct = await prismaClient.product.findFirst({
            where: {
                id,
                organizationId,
            },
        });

        if (!existingProduct) {
            throw new Error('Produto não encontrado');
        }

        const updateData: any = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.sku !== undefined) updateData.sku = data.sku;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.minStock !== undefined) updateData.minStock = data.minStock;
        if (data.currentStock !== undefined) updateData.currentStock = data.currentStock;
        if (data.unit !== undefined) updateData.unit = data.unit;
        if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
        if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
        if (data.active !== undefined) updateData.active = data.active;
        if (data.supplierName !== undefined) updateData.supplierName = data.supplierName?.trim() || null;
        if (data.supplierDoc !== undefined) updateData.supplierDoc = data.supplierDoc?.trim() || null;

        const product = await prismaClient.product.update({
            where: { id },
            data: updateData,
        });

        return product;
    }
}

export { UpdateProductService };


