import { prismaClient } from '../../config/prismaClient';
import { getStartOfDay, getEndOfDay, parseLocalDate, getCurrentLocalDate, formatLocalDate } from '../../utils/dateUtils';

class StockReportService {

    async getLowStockProducts(organizationId: string) {
        const products = await prismaClient.product.findMany({
            where: {
                organizationId,
                active: true,
                currentStock: {
                    lte: prismaClient.product.fields.minStock,
                },
            },
            orderBy: {
                currentStock: 'asc',
            },
        });

        return products;
    }


    async getDailyUsage(organizationId: string, date?: string) {
        const targetDate = date ? parseLocalDate(date) : getCurrentLocalDate();
        const startOfDay = getStartOfDay(targetDate);
        const endOfDay = getEndOfDay(targetDate);

        const exits = await prismaClient.stockExit.findMany({
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

        const grouped = exits.reduce((acc: any, exit) => {
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
            date: formatLocalDate(targetDate),
            products: Object.values(grouped),
            totalExits: exits.length,
        };
    }

    async getWeeklyUsage(organizationId: string, startDate?: string) {
        const start = startDate ? parseLocalDate(startDate) : getCurrentLocalDate();
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const exits = await prismaClient.stockExit.findMany({
            where: {
                organizationId,
                createdAt: {
                    gte: getStartOfDay(start),
                    lte: getEndOfDay(end),
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

        const grouped = exits.reduce((acc: any, exit) => {
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
            startDate: formatLocalDate(start),
            endDate: formatLocalDate(end),
            products: Object.values(grouped),
        };
    }

    async getTotalStockValue(organizationId: string) {
        const products = await prismaClient.product.findMany({
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
            productsWithStock: products.filter(p => p.currentStock > 0).length,
        };
    }


    async getCurrentStock(organizationId: string, category?: string) {
        const where: any = {
            organizationId,
            active: true,
        };

        if (category) {
            where.category = category;
        }

        const products = await prismaClient.product.findMany({
            where,
            orderBy: [
                { category: 'asc' },
                { name: 'asc' },
            ],
        });

        return products;
    }
}

export { StockReportService };


