import { prismaClient } from '../../config/prismaClient';
import {
    getStartOfDay,
    getEndOfDay,
    parseLocalDate,
    getCurrentLocalDate,
    formatLocalDate,
    diffExpirationCalendarDaysFromToday,
    getEndOfDayAfterToday,
    parseExpirationCalendarDate,
} from '../../utils/dateUtils';
import { MIN_VALID_EXPIRATION_DATE } from '../../utils/zodExpirationDate';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface PaginationParams {
    page?: number;
    limit?: number;
}

interface ExpiringProductsParams extends PaginationParams {
    days?: number;
    includeExpired?: boolean;
    onlyWithStock?: boolean;
}

class StockReportService {

    async getLowStockProducts(
        organizationId: string,
        paginationParams?: PaginationParams
    ) {
        const where = {
            organizationId,
            active: true,
            currentStock: {
                lte: prismaClient.product.fields.minStock,
            },
        };

        const page = Math.max(1, paginationParams?.page ?? DEFAULT_PAGE);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, paginationParams?.limit ?? DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prismaClient.product.findMany({
                where,
                orderBy: {
                    currentStock: 'asc',
                },
                skip,
                take: limit,
            }),
            prismaClient.product.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    async getExpiringProducts(
        organizationId: string,
        params?: ExpiringProductsParams
    ) {
        const days = params?.days ?? 30;
        const includeExpired = params?.includeExpired ?? true;
        const onlyWithStock = params?.onlyWithStock ?? false;

        const todayStart = getStartOfDay(getCurrentLocalDate());
        const windowEnd = getEndOfDayAfterToday(days);

        const expirationDateFilter: { lte: Date; gte?: Date } = {
            lte: windowEnd,
        };
        if (!includeExpired) {
            expirationDateFilter.gte = todayStart;
        }

        const where = {
            organizationId,
            active: true,
            expirationDate: {
                not: null,
                gt: MIN_VALID_EXPIRATION_DATE,
                ...expirationDateFilter,
            },
            ...(onlyWithStock ? { currentStock: { gt: 0 } } : {}),
        };

        const page = Math.max(1, params?.page ?? DEFAULT_PAGE);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, params?.limit ?? DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prismaClient.product.findMany({
                where,
                orderBy: {
                    expirationDate: 'asc',
                },
                skip,
                take: limit,
            }),
            prismaClient.product.count({ where }),
        ]);

        const productsWithExpiration = products.map((product) => {
            const expirationDate = product.expirationDate!;
            const expDay = parseExpirationCalendarDate(expirationDate);
            const isExpired = expDay < todayStart;
            const daysUntilExpiration = diffExpirationCalendarDaysFromToday(expirationDate);

            return {
                id: product.id,
                name: product.name,
                code: product.code,
                sku: product.sku,
                category: product.category,
                currentStock: product.currentStock,
                minStock: product.minStock,
                unit: product.unit,
                expirationDate: product.expirationDate,
                daysUntilExpiration,
                isExpired,
            };
        });

        const totalPages = Math.ceil(total / limit);

        return {
            products: productsWithExpiration,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
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
                        costPrice: true,
                        averageCost: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        type ExitWithProduct = (typeof exits)[number];
        const grouped = exits.reduce((acc: Record<string, { product: ExitWithProduct['product']; totalQuantity: number; exits: ExitWithProduct[] }>, exit: ExitWithProduct) => {
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
        }, {} as Record<string, { product: ExitWithProduct['product']; totalQuantity: number; exits: ExitWithProduct[] }>);

        const products = Object.values(grouped).map((row) => {
            const { costPrice, averageCost, ...rest } = row.product;
            return {
                ...row,
                product: {
                    ...rest,
                    costPrice: costPrice != null ? Number(costPrice) : null,
                    averageCost: averageCost != null ? Number(averageCost) : null,
                },
            };
        });

        return {
            date: formatLocalDate(targetDate),
            products,
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
                        costPrice: true,
                        averageCost: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        type ExitWithProduct = (typeof exits)[number];
        const grouped = exits.reduce((acc: Record<string, { product: ExitWithProduct['product']; totalQuantity: number; exits: ExitWithProduct[] }>, exit: ExitWithProduct) => {
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
        }, {} as Record<string, { product: ExitWithProduct['product']; totalQuantity: number; exits: ExitWithProduct[] }>);

        const products = Object.values(grouped).map((row) => {
            const { costPrice, averageCost, ...rest } = row.product;
            return {
                ...row,
                product: {
                    ...rest,
                    costPrice: costPrice != null ? Number(costPrice) : null,
                    averageCost: averageCost != null ? Number(averageCost) : null,
                },
            };
        });

        return {
            startDate: formatLocalDate(start),
            endDate: formatLocalDate(end),
            products,
            totalExits: exits.length,
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

        type ProductStock = (typeof products)[number];
        const totalValue = products.reduce((sum: number, product: ProductStock) => {
            const cost = product.averageCost ? Number(product.averageCost) : 0;
            return sum + (product.currentStock * cost);
        }, 0);

        return {
            totalValue,
            totalProducts: products.length,
            productsWithStock: products.filter((p: ProductStock) => p.currentStock > 0).length,
        };
    }


    async getCurrentStock(
        organizationId: string,
        category?: string,
        paginationParams?: PaginationParams
    ) {
        const where: any = {
            organizationId,
            active: true,
        };

        if (category) {
            where.category = category;
        }

        const page = Math.max(1, paginationParams?.page ?? DEFAULT_PAGE);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, paginationParams?.limit ?? DEFAULT_LIMIT)
        );
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prismaClient.product.findMany({
                where,
                orderBy: [
                    { category: 'asc' },
                    { name: 'asc' },
                ],
                skip,
                take: limit,
            }),
            prismaClient.product.count({ where }),
        ]);

        const productsWithTotalValue = products.map((product) => {
            const averageCost = product.averageCost ? Number(product.averageCost) : 0;
            const totalValue = product.currentStock * averageCost;
            return {
                ...product,
                totalValue,
            };
        });

        const totalPages = Math.ceil(total / limit);

        return {
            products: productsWithTotalValue,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }
}

export { StockReportService };


