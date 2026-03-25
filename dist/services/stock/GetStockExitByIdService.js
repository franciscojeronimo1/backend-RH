"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetStockExitByIdService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class GetStockExitByIdService {
    async execute(id, organizationId) {
        const exit = await prismaClient_1.prismaClient.stockExit.findFirst({
            where: { id, organizationId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        currentStock: true,
                        salePrice: true,
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
        if (!exit) {
            throw new Error('Saída não encontrada');
        }
        return exit;
    }
}
exports.GetStockExitByIdService = GetStockExitByIdService;
//# sourceMappingURL=GetStockExitByIdService.js.map