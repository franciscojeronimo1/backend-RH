"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetStockEntryByIdService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class GetStockEntryByIdService {
    async execute(id, organizationId) {
        const entry = await prismaClient_1.prismaClient.stockEntry.findFirst({
            where: { id, organizationId },
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
        if (!entry) {
            throw new Error('Entrada não encontrada');
        }
        return entry;
    }
}
exports.GetStockEntryByIdService = GetStockEntryByIdService;
//# sourceMappingURL=GetStockEntryByIdService.js.map