import { prismaClient } from '../../config/prismaClient';
import { getStartOfDay, getEndOfDay } from '../../utils/dateUtils';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FETCH_MULTIPLIER = 5; // Busca mais registros para garantir paginação correta no merge

interface ListMovementsParams {
    dateFrom?: string;
    dateTo?: string;
    productId?: string;
    supplier?: string;
    client?: string;
    type?: 'entry' | 'exit';
    page?: number;
    limit?: number;
}

interface MovementItem {
    id: string;
    type: 'entry' | 'exit';
    product: { id: string; name: string; code: string | null };
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    createdAt: Date;
    registeredBy: { id: string; name: string };
    notes: string | null;
    supplierName?: string | null;
    clientName?: string | null;
    invoiceNumber?: string | null;
    projectName?: string | null;
}

interface PaginatedMovements {
    movements: MovementItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

class ListStockMovementsService {
    async execute(
        organizationId: string,
        params?: ListMovementsParams
    ): Promise<PaginatedMovements> {
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

    private buildDateFilter(dateFrom?: string, dateTo?: string): { gte?: Date; lte?: Date } | undefined {
        if (!dateFrom && !dateTo) return undefined;
        const filter: { gte?: Date; lte?: Date } = {};
        if (dateFrom) {
            filter.gte = getStartOfDay(dateFrom);
        }
        if (dateTo) {
            filter.lte = getEndOfDay(dateTo);
        }
        return Object.keys(filter).length ? filter : undefined;
    }

    private async fetchEntries(
        organizationId: string,
        params: ListMovementsParams | undefined,
        dateFilter: { gte?: Date; lte?: Date } | undefined,
        limit: number
    ) {
        const where: any = { organizationId };

        if (params?.productId) where.productId = params.productId;
        if (dateFilter) where.createdAt = dateFilter;
        if (params?.supplier?.trim()) {
            where.supplierName = { contains: params.supplier.trim(), mode: 'insensitive' as const };
        }

        const rows = await prismaClient.stockEntry.findMany({
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
            type: 'entry' as const,
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

    private async fetchExits(
        organizationId: string,
        params: ListMovementsParams | undefined,
        dateFilter: { gte?: Date; lte?: Date } | undefined,
        limit: number
    ) {
        const where: any = { organizationId };

        if (params?.productId) where.productId = params.productId;
        if (dateFilter) where.createdAt = dateFilter;
        if (params?.client?.trim()) {
            where.clientName = { contains: params.client.trim(), mode: 'insensitive' as const };
        }

        const rows = await prismaClient.stockExit.findMany({
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
            type: 'exit' as const,
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

    private mergeAndSort(
        entries: MovementItem[],
        exits: MovementItem[]
    ): MovementItem[] {
        return [...entries, ...exits]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
}

export { ListStockMovementsService };
export type { MovementItem, PaginatedMovements, ListMovementsParams };
