import dayjs from 'dayjs';
import { prismaClient } from '../../config/prismaClient';
import { APP_TIMEZONE, formatLocalDate, getStartOfDay } from '../../utils/dateUtils';
import { GymSettingsService } from './GymSettingsService';
import { GymEvaluationService } from './GymEvaluationService';
import { GymNotificationService } from './GymNotificationService';
import { memberPublicSelect, withComputed } from './GymMembersService';
import { ymdToDbDate } from './gymDates';

/** Se o job não rodou nas últimas 6h (ex.: servidor serverless dormindo), avalia ao abrir o painel. */
const LAZY_EVALUATION_INTERVAL_MS = 6 * 60 * 60 * 1000;

class GymDashboardService {
    async execute(organizationId: string) {
        const settingsService = new GymSettingsService();
        let settings = await settingsService.get(organizationId);

        await new GymEvaluationService().evaluateOrganization(organizationId, {
            minIntervalMs: LAZY_EVALUATION_INTERVAL_MS,
        });
        settings = await settingsService.get(organizationId);

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
            paymentsOverdue,
            atRiskMembers,
            unreadNotifications,
            recentNotifications,
        ] = await Promise.all([
            prismaClient.member.count({ where: { organizationId, memberStatus: 'ACTIVE' } }),
            prismaClient.member.count({ where: { organizationId, memberStatus: 'AT_RISK' } }),
            prismaClient.member.count({ where: { organizationId, memberStatus: 'INACTIVE' } }),
            prismaClient.member.count({
                where: { organizationId, memberStatus: 'INACTIVE', deactivatedAt: { gte: monthStart } },
            }),
            prismaClient.accessEvent.count({
                where: { organizationId, result: 'GRANTED', direction: 'IN', occurredAt: { gte: todayStart } },
            }),
            prismaClient.accessEvent.findMany({
                where: { organizationId, result: 'GRANTED', direction: 'IN', occurredAt: { gte: weekStart } },
                select: { occurredAt: true },
            }),
            prismaClient.member.count({
                where: { organizationId, memberStatus: { not: 'INACTIVE' }, planExpiresAt: { gte: today, lte: planLimit } },
            }),
            prismaClient.member.count({
                where: { organizationId, memberStatus: { not: 'INACTIVE' }, planExpiresAt: { lt: today } },
            }),
            prismaClient.payment.count({ where: { organizationId, status: 'PENDING', dueDate: { lt: today } } }),
            prismaClient.member.findMany({
                where: { organizationId, memberStatus: 'AT_RISK' },
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
            const key = formatLocalDate(c.occurredAt);
            if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
        }

        const now = new Date();
        return {
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
                paymentsOverdue,
                unreadNotifications,
            },
            checkInsByDay: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
            atRiskMembers: atRiskMembers.map((m) => withComputed(m, now)),
            recentNotifications,
        };
    }
}

export { GymDashboardService };
