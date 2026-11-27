import dayjs from 'dayjs';
import { prismaClient } from '../../config/prismaClient';
import { APP_TIMEZONE, formatLocalDate, getStartOfDay } from '../../utils/dateUtils';
import { GymSettingsService } from './GymSettingsService';
import { GymEvaluationService } from './GymEvaluationService';
import { GymNotificationService } from './GymNotificationService';
import { memberPublicSelect, withComputed } from './GymMembersService';
import { dbDateToYmd, ymdToDbDate } from './gymDates';
import { buildDebtors, buildMonthlySeries, fromCents, lastMonths, toCents } from './ownerDashboard';

/** Meses no gráfico do painel do dono (incluindo o atual). */
const CHART_MONTHS = 6;

/** Se o job não rodou nas últimas 6h (ex.: servidor serverless dormindo), avalia ao abrir o painel. */
const LAZY_EVALUATION_INTERVAL_MS = 6 * 60 * 60 * 1000;

class GymDashboardService {
    /** `includeFinance`: receita, em aberto e inadimplentes só para administradores. */
    async execute(organizationId: string, options: { includeFinance?: boolean } = {}) {
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
            extra,
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
            prismaClient.member.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
        ]);
        const newThisMonth = extra;

        const finance = options.includeFinance ? await this.finance(organizationId, nowSp, today) : null;

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
                newThisMonth,
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
            finance,
        };
    }

    /** Números de dinheiro e séries mensais do painel do dono. */
    private async finance(organizationId: string, nowSp: dayjs.Dayjs, today: Date) {
        const monthStart = nowSp.startOf('month').toDate();
        const months = lastMonths(nowSp.format('YYYY-MM'), CHART_MONTHS);
        const chartStart = nowSp.subtract(CHART_MONTHS - 1, 'month').startOf('month').toDate();

        const [paidMonth, openAgg, overdueAgg, overdueRows, paidSeries, newSeries, deactSeries] = await Promise.all([
            prismaClient.payment.aggregate({
                where: { organizationId, status: 'PAID', paidAt: { gte: monthStart } },
                _sum: { amount: true },
                _count: true,
            }),
            prismaClient.payment.aggregate({
                where: { organizationId, status: 'PENDING', dueDate: { gte: today } },
                _sum: { amount: true },
                _count: true,
            }),
            prismaClient.payment.aggregate({
                where: { organizationId, status: 'PENDING', dueDate: { lt: today } },
                _sum: { amount: true },
                _count: true,
            }),
            prismaClient.payment.findMany({
                where: { organizationId, status: 'PENDING', dueDate: { lt: today } },
                select: {
                    memberId: true,
                    amount: true,
                    dueDate: true,
                    member: { select: { name: true, phone: true, memberStatus: true } },
                },
                orderBy: { dueDate: 'asc' },
                take: 5000,
            }),
            prismaClient.payment.findMany({
                where: { organizationId, status: 'PAID', paidAt: { gte: chartStart } },
                select: { amount: true, paidAt: true },
            }),
            prismaClient.member.findMany({
                where: { organizationId, createdAt: { gte: chartStart } },
                select: { createdAt: true },
            }),
            prismaClient.member.findMany({
                where: { organizationId, memberStatus: 'INACTIVE', deactivatedAt: { gte: chartStart } },
                select: { deactivatedAt: true },
            }),
        ]);

        const todayYmd = dbDateToYmd(today)!;
        const debtors = buildDebtors(
            overdueRows.map((p) => ({ ...p, dueDate: dbDateToYmd(p.dueDate)! })),
            todayYmd,
            10
        );
        return {
            revenueThisMonth: fromCents(toCents(paidMonth._sum.amount)),
            paymentsPaidThisMonth: paidMonth._count,
            openAmount: fromCents(toCents(openAgg._sum.amount)),
            openCount: openAgg._count,
            overdueAmount: fromCents(toCents(overdueAgg._sum.amount)),
            overdueCount: overdueAgg._count,
            debtorsCount: debtors.total,
            debtors: debtors.list,
            monthly: buildMonthlySeries(
                months,
                { paidPayments: paidSeries, newMembers: newSeries, deactivations: deactSeries },
                (d) => dayjs(d).tz(APP_TIMEZONE).format('YYYY-MM')
            ),
        };
    }
}

export { GymDashboardService };
