import { prismaClient } from '../../config/prismaClient';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

class DeleteStockEntryService {
    async execute(id: string, organizationId: string) {
        await prismaClient.$transaction(async (tx) => {
            const entry = await tx.stockEntry.findFirst({
                where: { id, organizationId },
                include: {
                    product: {
                        select: {
                            id: true,
                            currentStock: true,
                            averageCost: true,
                        },
                    },
                },
            });

            if (!entry) {
                throw new Error('Entrada não encontrada');
            }

            const product = entry.product;

            if (product.currentStock < entry.quantity) {
                throw new Error(
                    'Validação: estoque atual é menor que a quantidade desta entrada; não é possível excluir com segurança.'
                );
            }

            const oldStock = product.currentStock - entry.quantity;
            const oldTotalValue =
                product.currentStock * Number(product.averageCost ?? 0) -
                entry.quantity * Number(entry.unitPrice);
            const oldAvgCost = oldStock > 0 ? oldTotalValue / oldStock : 0;

            await tx.product.update({
                where: { id: product.id },
                data: {
                    currentStock: oldStock,
                    averageCost: new Decimal(oldAvgCost),
                },
            });

            await tx.stockEntry.delete({ where: { id } });
        });

        return { message: 'Entrada excluída com sucesso' };
    }
}

export { DeleteStockEntryService };
