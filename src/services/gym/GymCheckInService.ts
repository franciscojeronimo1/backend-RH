import { prismaClient } from '../../config/prismaClient';
import { GymError } from './GymError';
import { GymSettingsService } from './GymSettingsService';
import { GymNotificationService } from './GymNotificationService';
import { memberPublicSelect, withComputed } from './GymMembersService';
import { getEndOfDay, getStartOfDay, isValidDateString, parseLocalDate } from '../../utils/dateUtils';

/** Evita presença duplicada se a recepção clicar duas vezes. */
const DUPLICATE_WINDOW_MS = 60 * 60 * 1000;

/** Presença = evento de acesso liberado na entrada (manual ou catraca). */
const PRESENCE = { result: 'GRANTED', direction: 'IN' } as const;

class GymCheckInService {
    /** Check-in manual feito pela recepção. */
    async register(organizationId: string, memberId: string, userId?: string) {
        const member = await prismaClient.member.findFirst({
            where: { id: memberId, organizationId },
            select: memberPublicSelect,
        });
        if (!member) throw new GymError('Aluno não encontrado', 404);

        const now = new Date();
        const wasInactive = member.memberStatus === 'INACTIVE';

        // Clique duplo / presença repetida: não cria outro registro (só para quem já está ativo)
        if (!wasInactive) {
            const recent = await prismaClient.accessEvent.findFirst({
                where: {
                    organizationId,
                    memberId,
                    ...PRESENCE,
                    occurredAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
                },
                orderBy: { occurredAt: 'desc' },
            });
            if (recent) {
                return { checkIn: recent, member: withComputed(member, now), alreadyCheckedIn: true, reactivated: false };
            }
        }

        // Desativado manualmente (ex.: inadimplente, suspenso): a presença não reativa sozinho.
        if (wasInactive && member.deactivationReason === 'MANUAL') {
            throw new GymError(
                'Este aluno foi desativado manualmente. Reative o aluno antes de registrar a presença.',
                409,
                'MEMBER_MANUALLY_INACTIVE'
            );
        }

        const settings = await new GymSettingsService().get(organizationId);
        if (wasInactive && !settings.autoReactivateOnCheckIn) {
            throw new GymError('Este aluno está inativo. Reative o aluno antes de registrar a presença.', 409, 'MEMBER_INACTIVE');
        }
        const statusChanges = member.memberStatus !== 'ACTIVE';

        const [checkIn, updated] = await prismaClient.$transaction([
            prismaClient.accessEvent.create({
                data: { organizationId, memberId, userId: userId ?? null, method: 'MANUAL', ...PRESENCE, occurredAt: now },
            }),
            prismaClient.member.update({
                where: { id: memberId },
                data: {
                    lastCheckInAt: now,
                    ...(statusChanges
                        ? {
                              memberStatus: 'ACTIVE',
                              statusChangedAt: now,
                              activeSince: now,
                              deactivatedAt: null,
                              deactivationReason: null,
                          }
                        : {}),
                },
                select: memberPublicSelect,
            }),
        ]);

        if (wasInactive) {
            await new GymNotificationService().createMany(organizationId, [
                {
                    memberId,
                    type: 'MEMBER_REACTIVATED',
                    title: `${member.name} voltou a treinar!`,
                    message: 'Registrou presença e foi reativado(a) automaticamente.',
                    dedupeKey: `REACTIVATED:${memberId}:${checkIn.id}`,
                },
            ]);
        }

        return { checkIn, member: withComputed(updated, now), alreadyCheckedIn: false, reactivated: wasInactive };
    }

    /** Presenças do dia (manuais e da catraca), inclusive acessos negados. */
    async list(organizationId: string, date?: string) {
        const day = date && isValidDateString(date) ? parseLocalDate(date) : new Date();
        const checkIns = await prismaClient.accessEvent.findMany({
            where: { organizationId, occurredAt: { gte: getStartOfDay(day), lte: getEndOfDay(day) } },
            orderBy: { occurredAt: 'desc' },
            take: 500,
            include: {
                member: { select: { id: true, name: true, memberStatus: true, planName: true } },
                user: { select: { id: true, name: true } },
            },
        });
        return { checkIns, total: checkIns.filter((c) => c.result === 'GRANTED' && c.direction === 'IN').length };
    }

    /** Desfaz uma presença manual registrada por engano e recalcula a última presença do aluno. */
    async remove(organizationId: string, id: string) {
        const event = await prismaClient.accessEvent.findFirst({ where: { id, organizationId } });
        if (!event) throw new GymError('Presença não encontrada', 404);
        if (event.method !== 'MANUAL') throw new GymError('Só presenças registradas manualmente podem ser removidas', 400);

        await prismaClient.accessEvent.delete({ where: { id } });
        if (event.memberId) {
            const latest = await prismaClient.accessEvent.findFirst({
                where: { organizationId, memberId: event.memberId, ...PRESENCE },
                orderBy: { occurredAt: 'desc' },
                select: { occurredAt: true },
            });
            await prismaClient.member.update({
                where: { id: event.memberId },
                data: { lastCheckInAt: latest?.occurredAt ?? null },
            });
        }
        return { message: 'Presença removida' };
    }
}

export { GymCheckInService };
