import { prismaClient } from '../../config/prismaClient';
import { DEFAULT_GYM_SETTINGS } from './memberRules';
import { GymError } from './GymError';

export interface UpdateGymSettingsData {
    enabled?: boolean;
    atRiskAfterDays?: number;
    inactiveAfterDays?: number;
    autoDeactivate?: boolean;
    autoReactivateOnCheckIn?: boolean;
    planExpiringNoticeDays?: number;
    deactivateOnPlanExpired?: boolean;
    planExpiredGraceDays?: number;
    notifyAtRisk?: boolean;
}

class GymSettingsService {
    /** Busca as configurações da academia, criando com os padrões se ainda não existir. */
    async get(organizationId: string) {
        const existing = await prismaClient.gymSettings.findUnique({ where: { organizationId } });
        if (existing) return existing;
        return prismaClient.gymSettings.upsert({
            where: { organizationId },
            update: {},
            create: { organizationId, ...DEFAULT_GYM_SETTINGS },
        });
    }

    async update(organizationId: string, data: UpdateGymSettingsData) {
        const current = await this.get(organizationId);

        const atRisk = data.atRiskAfterDays ?? current.atRiskAfterDays;
        const inactive = data.inactiveAfterDays ?? current.inactiveAfterDays;
        if (inactive <= atRisk) {
            throw new GymError(
                'Os dias para desativar precisam ser maiores que os dias para marcar "em risco"',
                400
            );
        }

        const turningOn = data.enabled === true && !current.enabled;

        const updated = await prismaClient.gymSettings.update({
            where: { organizationId },
            data,
        });

        if (turningOn) {
            // Ao ligar o módulo, quem ainda não tem presença registrada ganha "carência" a partir de hoje.
            // Evita que todos os alunos antigos sejam desativados no primeiro dia só por falta de histórico.
            await prismaClient.client.updateMany({
                where: { organizationId, lastCheckInAt: null, activeSince: null },
                data: { activeSince: new Date() },
            });
        }

        return updated;
    }
}

export { GymSettingsService };
