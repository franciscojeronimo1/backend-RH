import { prismaClient } from '../../config/prismaClient';
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

class CreateProductService {
    async execute(
        organizationId: string,
        userId: string,
        name: string,
        code?: string,
        sku?: string,
        category?: string,
        minStock: number = 0,
        unit: string = 'UN',
        costPrice?: number,
        salePrice?: number,
        active: boolean = true,
        supplierName?: string,
        supplierDoc?: string,
        expirationDate?: Date,
        initialStock: number = 0,
        initialStockUnitPrice?: number
    ) {
        const initialQty = Math.max(0, Math.floor(initialStock));

        let entryUnitPrice = 0;
        if (initialQty > 0) {
            if (initialStockUnitPrice !== undefined && initialStockUnitPrice !== null) {
                entryUnitPrice = initialStockUnitPrice;
            } else if (costPrice !== undefined && costPrice !== null) {
                entryUnitPrice = costPrice;
            } else {
                entryUnitPrice = 0;
            }
        }

        const product = await prismaClient.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    organizationId,
                    name,
                    code,
                    sku,
                    category,
                    minStock,
                    unit,
                    costPrice: costPrice ? costPrice : null,
                    averageCost:
                        initialQty > 0 ? new Decimal(entryUnitPrice) : costPrice ? costPrice : null,
                    salePrice: salePrice ? salePrice : null,
                    currentStock: initialQty,
                    active,
                    supplierName: supplierName?.trim() || null,
                    supplierDoc: supplierDoc?.trim() || null,
                    expirationDate: expirationDate ?? null,
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

            if (initialQty > 0) {
                const totalPrice = initialQty * entryUnitPrice;
                await tx.stockEntry.create({
                    data: {
                        organizationId,
                        productId: created.id,
                        userId,
                        quantity: initialQty,
                        unitPrice: new Decimal(entryUnitPrice),
                        totalPrice: new Decimal(totalPrice),
                        supplierName: supplierName?.trim() || null,
                        supplierDoc: supplierDoc?.trim() || null,
                        notes: 'Estoque inicial no cadastro do produto',
                    },
                });
            }

            return created;
        });

        return product;
    }
}

export { CreateProductService };


