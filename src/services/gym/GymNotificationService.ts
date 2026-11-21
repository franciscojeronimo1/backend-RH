import { prismaClient } from '../../config/prismaClient';
import type { PlannedNotification } from './memberRules';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

class GymNotificationService {
    /** Cria avisos ignorando os que já existem (mesma dedupeKey). Retorna quantos foram criados. */
    async createMany(
        organizationId: string,
        items: Array<PlannedNotification & { clientId?: string | null }>
    ): Promise<number> {
        if (items.length === 0) return 0;
        const result = await prismaClient.notification.createMany({
            data: items.map((n) => ({
                organizationId,
                clientId: n.clientId ?? null,
                type: n.type,
                title: n.title,
                message: n.message,
                dedupeKey: n.dedupeKey,
            })),
            skipDuplicates: true,
        });
        return result.count;
    }

    async list(organizationId: string, params: { unreadOnly?: boolean; page?: number; limit?: number }) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
        const where = {
            organizationId,
            ...(params.unreadOnly ? { readAt: null } : {}),
        };
        const [notifications, total, unreadCount] = await Promise.all([
            prismaClient.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: { client: { select: { id: true, name: true, phone: true, memberStatus: true } } },
            }),
            prismaClient.notification.count({ where }),
            this.unreadCount(organizationId),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            notifications,
            unreadCount,
            pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
        };
    }

    unreadCount(organizationId: string) {
        return prismaClient.notification.count({ where: { organizationId, readAt: null } });
    }

    async markRead(organizationId: string, id: string) {
        const result = await prismaClient.notification.updateMany({
            where: { id, organizationId, readAt: null },
            data: { readAt: new Date() },
        });
        return { updated: result.count };
    }

    async markAllRead(organizationId: string) {
        const result = await prismaClient.notification.updateMany({
            where: { organizationId, readAt: null },
            data: { readAt: new Date() },
        });
        return { updated: result.count };
    }
}

export { GymNotificationService };
