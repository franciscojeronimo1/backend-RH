"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStockExitService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class CreateStockExitService {
    async execute(organizationId, productId, userId, quantity, projectName, clientName, serviceType, notes) {
        const product = await prismaClient_1.prismaClient.product.findFirst({
            where: {
                id: productId,
                organizationId,
            },
        });
        if (!product) {
            throw new Error('Produto não encontrado');
        }
        if (product.currentStock < quantity) {
            throw new Error(`Estoque insuficiente. Disponível: ${product.currentStock}, Solicitado: ${quantity}`);
        }
        const exit = await prismaClient_1.prismaClient.stockExit.create({
            data: {
                organizationId,
                productId,
                userId,
                quantity,
                projectName,
                clientName,
                serviceType,
                notes,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        currentStock: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        await prismaClient_1.prismaClient.product.update({
            where: { id: productId },
            data: {
                currentStock: product.currentStock - quantity,
            },
        });
        return exit;
    }
}
exports.CreateStockExitService = CreateStockExitService;
//# sourceMappingURL=CreateStockExitService.js.map