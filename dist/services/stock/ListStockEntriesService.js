"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListStockEntriesService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const dateUtils_1 = require("../../utils/dateUtils");
class ListStockEntriesService {
    async execute(organizationId, productId, date) {
        const where = {
            organizationId,
        };
        if (productId) {
            where.productId = productId;
        }
        if (date) {
            const targetDate = (0, dateUtils_1.parseLocalDate)(date);
            const startOfDay = (0, dateUtils_1.getStartOfDay)(targetDate);
            const endOfDay = (0, dateUtils_1.getEndOfDay)(targetDate);
            where.createdAt = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        const entries = await prismaClient_1.prismaClient.stockEntry.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return entries;
    }
}
exports.ListStockEntriesService = ListStockEntriesService;
//# sourceMappingURL=ListStockEntriesService.js.map