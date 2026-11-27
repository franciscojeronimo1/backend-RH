/**
 * Regras inteligentes de controle de alunos (funções puras, sem banco).
 * Facilita testar e garante o mesmo resultado no job diário, no check-in e no "rodar agora".
 */
import { diffCalendarDaysInAppTimezone, formatLocalDate, expirationDateToYmd, parseLocalDate } from '../../utils/dateUtils';

export type MemberStatusValue = 'ACTIVE' | 'AT_RISK' | 'INACTIVE';
export type DeactivationReasonValue = 'AUTO_ABSENCE' | 'AUTO_PLAN_EXPIRED' | 'MANUAL';
export type NotificationTypeValue =
    | 'MEMBER_AT_RISK'
    | 'MEMBER_DEACTIVATED'
    | 'MEMBER_REACTIVATED'
    | 'PLAN_EXPIRING'
    | 'PLAN_EXPIRED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_ISSUE';

export interface GymRuleSettings {
    atRiskAfterDays: number;
    inactiveAfterDays: number;
    autoDeactivate: boolean;
    planExpiringNoticeDays: number;
    deactivateOnPlanExpired: boolean;
    planExpiredGraceDays: number;
    notifyAtRisk: boolean;
}

export const DEFAULT_GYM_SETTINGS: GymRuleSettings & {
    autoReactivateOnCheckIn: boolean;
} = {
    atRiskAfterDays: 7,
    inactiveAfterDays: 30,
    autoDeactivate: true,
    autoReactivateOnCheckIn: true,
    planExpiringNoticeDays: 5,
    deactivateOnPlanExpired: false,
    planExpiredGraceDays: 5,
    notifyAtRisk: true,
};

export interface MemberSnapshot {
    id: string;
    name: string;
    memberStatus: MemberStatusValue;
    autoControl: boolean;
    lastCheckInAt: Date | null;
    activeSince: Date | null;
    createdAt: Date;
    planName: string | null;
    planExpiresAt: Date | null;
}

export interface PlannedNotification {
    type: NotificationTypeValue;
    title: string;
    message: string;
    dedupeKey: string;
}

export interface MemberEvaluation {
    /** Dias sem treinar (desde a última presença ou desde quando ficou ativo). */
    daysAbsent: number;
    /** Dias até o vencimento do plano (negativo = vencido). null se não tem plano. */
    daysToPlanExpiry: number | null;
    nextStatus: MemberStatusValue;
    deactivationReason: DeactivationReasonValue | null;
    statusChanged: boolean;
    notifications: PlannedNotification[];
}

/** Data de referência para contar ausência: a mais recente entre última presença e início/reativação. */
export function absenceBaseline(member: Pick<MemberSnapshot, 'lastCheckInAt' | 'activeSince' | 'createdAt'>): Date {
    const candidates = [member.lastCheckInAt, member.activeSince ?? member.createdAt].filter(
        (d): d is Date => d instanceof Date
    );
    return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

function plural(n: number, one: string, many: string) {
    return `${n} ${n === 1 ? one : many}`;
}

/**
 * Avalia um aluno e devolve o próximo status + avisos a criar.
 * Idempotente: as dedupeKeys identificam o "episódio" (ex.: ausência desde a data X),
 * então rodar várias vezes no mesmo dia (ou em dias seguidos) não duplica avisos.
 */
export function evaluateMember(member: MemberSnapshot, settings: GymRuleSettings, now: Date): MemberEvaluation {
    const baseline = absenceBaseline(member);
    const baselineYmd = formatLocalDate(baseline);
    const daysAbsent = Math.max(0, diffCalendarDaysInAppTimezone(baseline, now));

    let daysToPlanExpiry: number | null = null;
    let planYmd: string | null = null;
    if (member.planExpiresAt) {
        planYmd = expirationDateToYmd(member.planExpiresAt);
        daysToPlanExpiry = diffCalendarDaysInAppTimezone(now, parseLocalDate(planYmd));
    }

    const result: MemberEvaluation = {
        daysAbsent,
        daysToPlanExpiry,
        nextStatus: member.memberStatus,
        deactivationReason: null,
        statusChanged: false,
        notifications: [],
    };

    // Alunos inativos ou com controle automático desligado não são alterados pelo sistema.
    if (member.memberStatus === 'INACTIVE' || !member.autoControl) {
        return result;
    }

    const atRiskAfter = Math.max(1, settings.atRiskAfterDays);
    const inactiveAfter = Math.max(atRiskAfter + 1, settings.inactiveAfterDays);
    const planLabel = member.planName ? `O plano "${member.planName}"` : 'O plano';

    // 1) Plano vencido além da carência → desativa (se configurado)
    if (
        settings.deactivateOnPlanExpired &&
        daysToPlanExpiry !== null &&
        -daysToPlanExpiry > Math.max(0, settings.planExpiredGraceDays)
    ) {
        result.nextStatus = 'INACTIVE';
        result.deactivationReason = 'AUTO_PLAN_EXPIRED';
        result.notifications.push({
            type: 'MEMBER_DEACTIVATED',
            title: `${member.name} foi desativado(a)`,
            message: `${planLabel} venceu há ${plural(-daysToPlanExpiry, 'dia', 'dias')} e não foi renovado. O sistema desativou automaticamente. Se ele(a) renovar ou voltar a treinar, é só reativar.`,
            dedupeKey: `DEACTIVATED:${member.id}:PLAN:${planYmd}`,
        });
    }
    // 2) Ausência longa → desativa
    else if (settings.autoDeactivate && daysAbsent >= inactiveAfter) {
        result.nextStatus = 'INACTIVE';
        result.deactivationReason = 'AUTO_ABSENCE';
        result.notifications.push({
            type: 'MEMBER_DEACTIVATED',
            title: `${member.name} foi desativado(a)`,
            message: `Está há ${plural(daysAbsent, 'dia', 'dias')} sem treinar. O sistema desativou automaticamente. Se ele(a) voltar e registrar presença, é reativado(a) sozinho.`,
            dedupeKey: `DEACTIVATED:${member.id}:ABSENCE:${baselineYmd}`,
        });
    }
    // 3) Ausência média → em risco
    else if (daysAbsent >= atRiskAfter) {
        result.nextStatus = 'AT_RISK';
        if (settings.notifyAtRisk) {
            result.notifications.push({
                type: 'MEMBER_AT_RISK',
                title: `${member.name} está sumido(a)`,
                message: `Está há ${plural(daysAbsent, 'dia', 'dias')} sem treinar. Que tal mandar uma mensagem chamando de volta?`,
                dedupeKey: `AT_RISK:${member.id}:${baselineYmd}`,
            });
        }
    } else {
        result.nextStatus = 'ACTIVE';
    }

    // Avisos de plano (independem do status por ausência)
    if (daysToPlanExpiry !== null && result.deactivationReason !== 'AUTO_PLAN_EXPIRED') {
        if (daysToPlanExpiry >= 0 && daysToPlanExpiry <= Math.max(0, settings.planExpiringNoticeDays)) {
            const when =
                daysToPlanExpiry === 0
                    ? 'vence hoje'
                    : daysToPlanExpiry === 1
                      ? 'vence amanhã'
                      : `vence em ${daysToPlanExpiry} dias`;
            result.notifications.push({
                type: 'PLAN_EXPIRING',
                title: `Plano de ${member.name} ${when}`,
                message: `${planLabel} ${when}. Lembre o aluno de renovar.`,
                dedupeKey: `PLAN_EXPIRING:${member.id}:${planYmd}`,
            });
        } else if (daysToPlanExpiry < 0) {
            result.notifications.push({
                type: 'PLAN_EXPIRED',
                title: `Plano de ${member.name} venceu`,
                message: `${planLabel} venceu há ${plural(-daysToPlanExpiry, 'dia', 'dias')}. Verifique a renovação.`,
                dedupeKey: `PLAN_EXPIRED:${member.id}:${planYmd}`,
            });
        }
    }

    result.statusChanged = result.nextStatus !== member.memberStatus;
    return result;
}
