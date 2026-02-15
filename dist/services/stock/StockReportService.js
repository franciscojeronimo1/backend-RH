"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockReportService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const dateUtils_1 = require("../../utils/dateUtils");
class StockReportService {
    async getLowStockProducts(organizationId) {
        const products = await prismaClient_1.prismaClient.product.findMany({
            where: {
                organizationId,
                active: true,
                currentStock: {
                    lte: prismaClient_1.prismaClient.product.fields.minStock,
                },
            },
            orderBy: {
                currentStock: 'asc',
            },
        });
        return products;
    }
    async getDailyUsage(organizationId, date) {
        const targetDate = date ? (0, dateUtils_1.parseLocalDate)(date) : (0, dateUtils_1.getCurrentLocalDate)();
        const startOfDay = (0, dateUtils_1.getStartOfDay)(targetDate);
        const endOfDay = (0, dateUtils_1.getEndOfDay)(targetDate);
        const exits = await prismaClient_1.prismaClient.stockExit.findMany({
            where: {
                organizationId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        unit: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        const grouped = exits.reduce((acc, exit) => {
            const productId = exit.productId;
            if (!acc[productId]) {
                acc[productId] = {
                    product: exit.product,
                    totalQuantity: 0,
                    exits: [],
                };
            }
            acc[productId].totalQuantity += exit.quantity;
            acc[productId].exits.push(exit);
            return acc;
        }, {});
        return {
            date: (0, dateUtils_1.formatLocalDate)(targetDate),
            products: Object.values(grouped),
            totalExits: exits.length,
        };
    }
    async getWeeklyUsage(organizationId, startDate) {
        const start = startDate ? (0, dateUtils_1.parseLocalDate)(startDate) : (0, dateUtils_1.getCurrentLocalDate)();
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const exits = await prismaClient_1.prismaClient.stockExit.findMany({
            where: {
                organizationId,
                createdAt: {
                    gte: (0, dateUtils_1.getStartOfDay)(start),
                    lte: (0, dateUtils_1.getEndOfDay)(end),
                },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        unit: true,
                    },
                },
            },
        });
        const grouped = exits.reduce((acc, exit) => {
            const productId = exit.productId;
            if (!acc[productId]) {
                acc[productId] = {
                    product: exit.product,
                    totalQuantity: 0,
                };
            }
            acc[productId].totalQuantity += exit.quantity;
            return acc;
        }, {});
        return {
            startDate: (0, dateUtils_1.formatLocalDate)(start),
            endDate: (0, dateUtils_1.formatLocalDate)(end),
            products: Object.values(grouped),
        };
    }
    async getTotalStockValue(organizationId) {
        const products = await prismaClient_1.prismaClient.product.findMany({
            where: {
                organizationId,
                active: true,
            },
            select: {
                currentStock: true,
                averageCost: true,
            },
        });
        const totalValue = products.reduce((sum, product) => {
            const cost = product.averageCost ? Number(product.averageCost) : 0;
            return sum + (product.currentStock * cost);
        }, 0);
        return {
            totalValue,
            totalProducts: products.length,
            productsWithStock: products.filter((p) => p.currentStock > 0).length,
        };
    }
    async getCurrentStock(organizationId, category) {
        const where = {
            organizationId,
            active: true,
        };
        if (category) {
            where.category = category;
        }
        const products = await prismaClient_1.prismaClient.product.findMany({
            where,
            orderBy: [
                { category: 'asc' },
                { name: 'asc' },
            ],
        });
        return products;
    }
}
exports.StockReportService = StockReportService;
//# sourceMappingURL=StockReportService.js.map