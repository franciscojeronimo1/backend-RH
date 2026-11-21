import dayjs from 'dayjs';
import { prismaClient } from '../../config/prismaClient';
import { APP_TIMEZONE, formatLocalDate, getStartOfDay } from '../../utils/dateUtils';
import { GymSettingsService } from './GymSettingsService';
import { GymEvaluationService } from './GymEvaluationService';
import { GymNotificationService } from './GymNotificationService';
import { memberPublicSelect, withComputed, ymdToDbDate } from './GymMembersService';

/** Se o job não rodou nas últimas 6h (ex.: servidor serverless dormindo), avalia ao abrir o painel. */
const LAZY_EVALUATION_INTERVAL_MS = 6 * 60 * 60 * 1000;

class GymDashboardService {
    async execute(organizationId: string) {
        const settingsService = new GymSettingsService();
        let settings = await settingsService.get(organizationId);

        if (settings.enabled) {
            await new GymEvaluationService().evaluateOrganization(organizationId, {
                minIntervalMs: LAZY_EVALUATION_INTERVAL_MS,
            });
            settings = await settingsService.get(organizationId);
        }

        const nowSp = dayjs().tz(APP_TIMEZONE);
        const todayStart = getStartOfDay(new Date());
        const weekStart = nowSp.subtract(6, 'day').startOf('day').toDate();
        const monthStart = nowSp.startOf('month').toDate();
        const todayYmd = nowSp.format('YYYY-MM-DD');
        const today = ymdToDbDate(todayYmd);
        const planLimit = ymdToDbDate(nowSp.add(settings.planExpiringNoticeDays, 'day').format('YYYY-MM-DD'));

        const [
            activeCount,
            atRiskCount,
            inactiveCount,
            deactivatedThisMonth,
            checkInsToday,
            weekCheckIns,
            plansExpiringSoon,
            plansExpired,
            atRiskMembers,
            unreadNotifications,
            recentNotifications,
        ] = await Promise.all([
            prismaClient.client.count({ where: { organizationId, active: true, memberStatus: 'ACTIVE' } }),
            prismaClient.client.count({ where: { organizationId, active: true, memberStatus: 'AT_RISK' } }),
            prismaClient.client.count({
                where: { organizationId, OR: [{ active: false }, { memberStatus: 'INACTIVE' }] },
            }),
            prismaClient.client.count({
                where: { organizationId, memberStatus: 'INACTIVE', deactivatedAt: { gte: monthStart } },
            }),
            prismaClient.checkIn.count({ where: { organizationId, checkedInAt: { gte: todayStart } } }),
            prismaClient.checkIn.findMany({
                where: { organizationId, checkedInAt: { gte: weekStart } },
                select: { checkedInAt: true },
            }),
            prismaClient.client.count({
                where: { organizationId, active: true, planExpiresAt: { gte: today, lte: planLimit } },
            }),
            prismaClient.client.count({ where: { organizationId, active: true, planExpiresAt: { lt: today } } }),
            prismaClient.client.findMany({
                where: { organizationId, active: true, memberStatus: 'AT_RISK' },
                select: memberPublicSelect,
                orderBy: [{ lastCheckInAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
                take: 10,
            }),
            new GymNotificationService().unreadCount(organizationId),
            prismaClient.notification.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
        ]);

        // Presenças por dia (últimos 7 dias) para o gráfico
        const byDay = new Map<string, number>();
        for (let i = 6; i >= 0; i--) byDay.set(nowSp.subtract(i, 'day').format('YYYY-MM-DD'), 0);
        for (const c of weekCheckIns) {
            const key = formatLocalDate(c.checkedInAt);
            if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
        }

        const now = new Date();
        return {
            enabled: settings.enabled,
            lastEvaluatedAt: settings.lastEvaluatedAt,
            rules: {
                atRiskAfterDays: settings.atRiskAfterDays,
                inactiveAfterDays: settings.inactiveAfterDays,
                autoDeactivate: settings.autoDeactivate,
            },
            totals: {
                active: activeCount,
                atRisk: atRiskCount,
                inactive: inactiveCount,
                deactivatedThisMonth,
                checkInsToday,
                checkInsWeek: weekCheckIns.length,
                plansExpiringSoon,
                plansExpired,
                unreadNotifications,
            },
            checkInsByDay: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
            atRiskMembers: atRiskMembers.map((m) => withComputed(m, now)),
            recentNotifications,
        };
    }
}

export { GymDashboardService };
