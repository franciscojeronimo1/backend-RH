import { prismaClient } from '../../config/prismaClient';
import { DEFAULT_GYM_SETTINGS } from './memberRules';
import { GymError } from './GymError';

export interface UpdateGymSettingsData {
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
    /** Busca as regras da academia, criando com os padrões na primeira vez. */
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
            throw new GymError('Os dias para desativar precisam ser maiores que os dias para marcar "em risco"', 400);
        }
        return prismaClient.gymSettings.update({ where: { organizationId }, data });
    }
}

export { GymSettingsService };
