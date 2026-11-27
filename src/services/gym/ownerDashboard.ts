/**
 * Cálculos puros do painel do dono (sem banco): séries mensais e inadimplentes.
 * Valores em dinheiro são somados em centavos para não acumular erro de ponto flutuante.
 */

type Money = number | string | { toString(): string };

export const toCents = (v: Money | null | undefined): number => {
    if (v === null || v === undefined) return 0;
    const n = typeof v === 'number' ? v : Number(v.toString());
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const fromCents = (c: number) => Math.round(c) / 100;

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Últimos `count` meses terminando no mês de `currentMonth` ("YYYY-MM"), do mais antigo ao atual. */
export function lastMonths(currentMonth: string, count: number): string[] {
    const [y, m] = currentMonth.split('-').map(Number) as [number, number];
    const out: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
        const idx = y * 12 + (m - 1) - i;
        out.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`);
    }
    return out;
}

export function monthLabel(month: string): string {
    const [y, m] = month.split('-');
    return `${MONTH_LABELS[Number(m) - 1]}/${String(y).slice(2)}`;
}

export interface MonthlyPoint {
    month: string;
    label: string;
    revenue: number;
    paymentsPaid: number;
    newMembers: number;
    deactivated: number;
}

/**
 * Agrupa por mês. `monthOf` converte uma data no "YYYY-MM" do fuso da academia.
 * Itens fora da janela são ignorados.
 */
export function buildMonthlySeries(
    months: string[],
    input: {
        paidPayments: Array<{ amount: Money; paidAt: Date | null }>;
        newMembers: Array<{ createdAt: Date }>;
        deactivations: Array<{ deactivatedAt: Date | null }>;
    },
    monthOf: (d: Date) => string
): MonthlyPoint[] {
    const acc = new Map(months.map((m) => [m, { cents: 0, paid: 0, newMembers: 0, deactivated: 0 }]));
    for (const p of input.paidPayments) {
        if (!p.paidAt) continue;
        const a = acc.get(monthOf(p.paidAt));
        if (a) {
            a.cents += toCents(p.amount);
            a.paid++;
        }
    }
    for (const m of input.newMembers) {
        const a = acc.get(monthOf(m.createdAt));
        if (a) a.newMembers++;
    }
    for (const m of input.deactivations) {
        if (!m.deactivatedAt) continue;
        const a = acc.get(monthOf(m.deactivatedAt));
        if (a) a.deactivated++;
    }
    return months.map((month) => {
        const a = acc.get(month)!;
        return {
            month,
            label: monthLabel(month),
            revenue: fromCents(a.cents),
            paymentsPaid: a.paid,
            newMembers: a.newMembers,
            deactivated: a.deactivated,
        };
    });
}

export interface OverduePaymentRow {
    memberId: string;
    amount: Money;
    /** Vencimento como "YYYY-MM-DD" */
    dueDate: string;
    member: { name: string; phone: string | null; memberStatus: string };
}

export interface Debtor {
    memberId: string;
    name: string;
    phone: string | null;
    memberStatus: string;
    amount: number;
    payments: number;
    oldestDueDate: string;
    daysLate: number;
}

const daysBetweenYmd = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Junta as mensalidades vencidas por aluno: total devido, quantas, vencimento mais antigo e dias de atraso.
 * Ordena por mais dias de atraso e depois maior valor.
 */
export function buildDebtors(rows: OverduePaymentRow[], todayYmd: string, limit = 10): { total: number; list: Debtor[] } {
    const byMember = new Map<string, { cents: number; count: number; oldest: string; row: OverduePaymentRow }>();
    for (const r of rows) {
        if (r.dueDate >= todayYmd) continue;
        const cur = byMember.get(r.memberId);
        if (cur) {
            cur.cents += toCents(r.amount);
            cur.count++;
            if (r.dueDate < cur.oldest) cur.oldest = r.dueDate;
        } else {
            byMember.set(r.memberId, { cents: toCents(r.amount), count: 1, oldest: r.dueDate, row: r });
        }
    }
    const list = Array.from(byMember.entries())
        .map(([memberId, v]) => ({
            memberId,
            name: v.row.member.name,
            phone: v.row.member.phone,
            memberStatus: v.row.member.memberStatus,
            amount: fromCents(v.cents),
            payments: v.count,
            oldestDueDate: v.oldest,
            daysLate: daysBetweenYmd(v.oldest, todayYmd),
        }))
        .sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount || a.name.localeCompare(b.name, 'pt-BR'));
    return { total: list.length, list: list.slice(0, limit) };
}
