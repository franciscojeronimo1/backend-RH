"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListStockMovementsService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
const dateUtils_1 = require("../../utils/dateUtils");
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FETCH_MULTIPLIER = 5;
class ListStockMovementsService {
    async execute(organizationId, params) {
        const page = Math.max(1, params?.page ?? DEFAULT_PAGE);
        const limit = Math.min(MAX_LIMIT, Math.max(1, params?.limit ?? DEFAULT_LIMIT));
        const fetchLimit = Math.min(limit * FETCH_MULTIPLIER * 2, 500);
        const dateFilter = this.buildDateFilter(params?.dateFrom, params?.dateTo);
        const type = params?.type;
        const [entries, exits] = await Promise.all([
            type === 'exit' ? Promise.resolve([]) : this.fetchEntries(organizationId, params ?? {}, dateFilter, fetchLimit),
            type === 'entry' ? Promise.resolve([]) : this.fetchExits(organizationId, params ?? {}, dateFilter, fetchLimit),
        ]);
        const merged = this.mergeAndSort(entries, exits);
        const total = merged.length;
        const paginated = merged.slice((page - 1) * limit, page * limit);
        const totalPages = Math.ceil(total / limit);
        return {
            movements: paginated,
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
    buildDateFilter(dateFrom, dateTo) {
        if (!dateFrom && !dateTo)
            return undefined;
        const filter = {};
        if (dateFrom) {
            filter.gte = (0, dateUtils_1.getStartOfDay)(dateFrom);
        }
        if (dateTo) {
            filter.lte = (0, dateUtils_1.getEndOfDay)(dateTo);
        }
        return Object.keys(filter).length ? filter : undefined;
    }
    async fetchEntries(organizationId, params, dateFilter, limit) {
        const where = { organizationId };
        if (params?.productId)
            where.productId = params.productId;
        if (dateFilter)
            where.createdAt = dateFilter;
        if (params?.supplier?.trim()) {
            where.supplierName = { contains: params.supplier.trim(), mode: 'insensitive' };
        }
        const rows = await prismaClient_1.prismaClient.stockEntry.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, code: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return rows.map((e) => ({
            id: e.id,
            type: 'entry',
            product: e.product,
            quantity: e.quantity,
            unitPrice: Number(e.unitPrice),
            totalPrice: Number(e.totalPrice),
            createdAt: e.createdAt,
            registeredBy: e.user,
            notes: e.notes,
            supplierName: e.supplierName,
            invoiceNumber: e.invoiceNumber,
        }));
    }
    async fetchExits(organizationId, params, dateFilter, limit) {
        const where = { organizationId };
        if (params?.productId)
            where.productId = params.productId;
        if (dateFilter)
            where.createdAt = dateFilter;
        if (params?.client?.trim()) {
            where.clientName = { contains: params.client.trim(), mode: 'insensitive' };
        }
        const rows = await prismaClient_1.prismaClient.stockExit.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, code: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return rows.map((e) => ({
            id: e.id,
            type: 'exit',
            product: e.product,
            quantity: e.quantity,
            unitPrice: e.unitPrice != null ? Number(e.unitPrice) : null,
            totalPrice: e.totalPrice != null ? Number(e.totalPrice) : null,
            createdAt: e.createdAt,
            registeredBy: e.user,
            notes: e.notes,
            clientName: e.clientName,
            projectName: e.projectName,
        }));
    }
    mergeAndSort(entries, exits) {
        return [...entries, ...exits]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
}
exports.ListStockMovementsService = ListStockMovementsService;
//# sourceMappingURL=ListStockMovementsService.js.map