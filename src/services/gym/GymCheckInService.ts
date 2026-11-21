import { prismaClient } from '../../config/prismaClient';
import { GymError } from './GymError';
import { GymSettingsService } from './GymSettingsService';
import { GymNotificationService } from './GymNotificationService';
import { memberPublicSelect, withComputed } from './GymMembersService';
import { getEndOfDay, getStartOfDay, isValidDateString, parseLocalDate } from '../../utils/dateUtils';

/** Evita presença duplicada se a recepção clicar duas vezes. */
const DUPLICATE_WINDOW_MS = 60 * 60 * 1000;

class GymCheckInService {
    async register(organizationId: string, clientId: string, userId?: string) {
        const member = await prismaClient.client.findFirst({
            where: { id: clientId, organizationId },
            select: memberPublicSelect,
        });
        if (!member) throw new GymError('Aluno não encontrado', 404);

        const now = new Date();
        const wasInactive = member.memberStatus === 'INACTIVE' || !member.active;

        // Clique duplo / presença repetida: não cria outro registro (só para quem já está ativo)
        if (!wasInactive) {
            const recent = await prismaClient.checkIn.findFirst({
                where: { organizationId, clientId, checkedInAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) } },
                orderBy: { checkedInAt: 'desc' },
            });
            if (recent) {
                return {
                    checkIn: recent,
                    member: withComputed(member, now),
                    alreadyCheckedIn: true,
                    reactivated: false,
                };
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
            throw new GymError(
                'Este aluno está inativo. Reative o aluno antes de registrar a presença.',
                409,
                'MEMBER_INACTIVE'
            );
        }
        const statusChanges = member.memberStatus !== 'ACTIVE' || !member.active;

        const [checkIn, updated] = await prismaClient.$transaction([
            prismaClient.checkIn.create({
                data: { organizationId, clientId, userId: userId ?? null, checkedInAt: now },
            }),
            prismaClient.client.update({
                where: { id: clientId },
                data: {
                    lastCheckInAt: now,
                    ...(statusChanges
                        ? {
                              active: true,
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
                    clientId,
                    type: 'MEMBER_REACTIVATED',
                    title: `${member.name} voltou a treinar!`,
                    message: 'Registrou presença e foi reativado(a) automaticamente.',
                    dedupeKey: `REACTIVATED:${clientId}:${checkIn.id}`,
                },
            ]);
        }

        return {
            checkIn,
            member: withComputed(updated, now),
            alreadyCheckedIn: false,
            reactivated: wasInactive,
        };
    }

    async list(organizationId: string, date?: string) {
        const day = date && isValidDateString(date) ? parseLocalDate(date) : new Date();
        const checkIns = await prismaClient.checkIn.findMany({
            where: {
                organizationId,
                checkedInAt: { gte: getStartOfDay(day), lte: getEndOfDay(day) },
            },
            orderBy: { checkedInAt: 'desc' },
            take: 500,
            include: {
                client: { select: { id: true, name: true, memberStatus: true, planName: true } },
                user: { select: { id: true, name: true } },
            },
        });
        return { checkIns, total: checkIns.length };
    }

    /** Desfaz uma presença registrada por engano e recalcula a última presença do aluno. */
    async remove(organizationId: string, id: string) {
        const checkIn = await prismaClient.checkIn.findFirst({ where: { id, organizationId } });
        if (!checkIn) throw new GymError('Presença não encontrada', 404);

        await prismaClient.checkIn.delete({ where: { id } });
        const latest = await prismaClient.checkIn.findFirst({
            where: { organizationId, clientId: checkIn.clientId },
            orderBy: { checkedInAt: 'desc' },
            select: { checkedInAt: true },
        });
        await prismaClient.client.update({
            where: { id: checkIn.clientId },
            data: { lastCheckInAt: latest?.checkedInAt ?? null },
        });
        return { message: 'Presença removida' };
    }
}

export { GymCheckInService };
