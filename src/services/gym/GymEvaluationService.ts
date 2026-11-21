import { prismaClient } from '../../config/prismaClient';
import { GymSettingsService } from './GymSettingsService';
import { GymNotificationService } from './GymNotificationService';
import { evaluateMember, type MemberSnapshot, type PlannedNotification } from './memberRules';

export interface EvaluationSummary {
    organizationId: string;
    skipped?: 'DISABLED' | 'RECENTLY_EVALUATED';
    evaluated: number;
    becameAtRisk: number;
    deactivated: number;
    backToActive: number;
    notificationsCreated: number;
}

const BATCH_SIZE = 500;

const memberSelect = {
    id: true,
    name: true,
    memberStatus: true,
    active: true,
    autoControl: true,
    lastCheckInAt: true,
    activeSince: true,
    createdAt: true,
    planName: true,
    planExpiresAt: true,
} as const;

/**
 * Motor de regras: percorre os alunos ativos/em risco, atualiza status e gera avisos.
 * Seguro para rodar quantas vezes quiser (idempotente):
 *  - updates condicionais (só muda se o status ainda for o mesmo lido);
 *  - avisos com dedupeKey única por organização.
 */
class GymEvaluationService {
    private settingsService = new GymSettingsService();
    private notificationService = new GymNotificationService();

    async evaluateOrganization(
        organizationId: string,
        options: { now?: Date; minIntervalMs?: number } = {}
    ): Promise<EvaluationSummary> {
        const now = options.now ?? new Date();
        const summary: EvaluationSummary = {
            organizationId,
            evaluated: 0,
            becameAtRisk: 0,
            deactivated: 0,
            backToActive: 0,
            notificationsCreated: 0,
        };

        const settings = await this.settingsService.get(organizationId);
        if (!settings.enabled) return { ...summary, skipped: 'DISABLED' };
        if (
            options.minIntervalMs &&
            settings.lastEvaluatedAt &&
            now.getTime() - settings.lastEvaluatedAt.getTime() < options.minIntervalMs
        ) {
            return { ...summary, skipped: 'RECENTLY_EVALUATED' };
        }

        let cursor: string | undefined;
        for (;;) {
            const members: MemberSnapshot[] = await prismaClient.client.findMany({
                where: {
                    organizationId,
                    active: true,
                    autoControl: true,
                    memberStatus: { in: ['ACTIVE', 'AT_RISK'] },
                },
                select: memberSelect,
                orderBy: { id: 'asc' },
                take: BATCH_SIZE,
                ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            });
            if (members.length === 0) break;
            cursor = members[members.length - 1]!.id;

            const notifications: Array<PlannedNotification & { clientId: string }> = [];

            for (const member of members) {
                summary.evaluated++;
                const evaluation = evaluateMember(member, settings, now);
                notifications.push(...evaluation.notifications.map((n) => ({ ...n, clientId: member.id })));

                if (!evaluation.statusChanged) continue;

                const isDeactivation = evaluation.nextStatus === 'INACTIVE';
                const result = await prismaClient.client.updateMany({
                    where: { id: member.id, organizationId, memberStatus: member.memberStatus, active: true },
                    data: {
                        memberStatus: evaluation.nextStatus,
                        statusChangedAt: now,
                        ...(isDeactivation
                            ? {
                                  active: false,
                                  deactivatedAt: now,
                                  deactivationReason: evaluation.deactivationReason,
                              }
                            : {}),
                    },
                });
                if (result.count === 0) continue;

                if (isDeactivation) summary.deactivated++;
                else if (evaluation.nextStatus === 'AT_RISK') summary.becameAtRisk++;
                else summary.backToActive++;
            }

            summary.notificationsCreated += await this.notificationService.createMany(organizationId, notifications);
            if (members.length < BATCH_SIZE) break;
        }

        await prismaClient.gymSettings.update({
            where: { organizationId },
            data: { lastEvaluatedAt: now },
        });

        return summary;
    }

    /** Roda para todas as academias com o módulo ligado. Usado pelo agendador e pelo endpoint de cron. */
    async evaluateAll(options: { now?: Date; minIntervalMs?: number } = {}): Promise<EvaluationSummary[]> {
        const orgs = await prismaClient.gymSettings.findMany({
            where: { enabled: true },
            select: { organizationId: true },
        });
        const results: EvaluationSummary[] = [];
        for (const { organizationId } of orgs) {
            try {
                results.push(await this.evaluateOrganization(organizationId, options));
            } catch (error) {
                console.error(`[academia] Falha ao avaliar organização ${organizationId}:`, error);
            }
        }
        return results;
    }
}

export { GymEvaluationService };
