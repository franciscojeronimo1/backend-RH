import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDebtors, buildMonthlySeries, lastMonths, monthLabel, toCents } from '../src/services/gym/ownerDashboard';

test('lastMonths vira o ano corretamente', () => {
    assert.deepEqual(lastMonths('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02']);
    assert.deepEqual(lastMonths('2026-11', 1), ['2026-11']);
    assert.equal(monthLabel('2026-03'), 'mar/26');
});

test('toCents soma sem erro de ponto flutuante (Decimal/string/number)', () => {
    const total = [0.1, '0.2', { toString: () => '99.90' }].reduce((s: number, v) => s + toCents(v), 0);
    assert.equal(total, 10020);
    assert.equal(toCents(null), 0);
    assert.equal(toCents('abc'), 0);
});

test('série mensal agrupa receita, novos e desativados no fuso de Brasília', () => {
    const months = lastMonths('2026-11', 3); // set, out, nov
    // 01/11 01:00 UTC ainda é 31/10 em Brasília
    const monthOf = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 7);
    const s = buildMonthlySeries(
        months,
        {
            paidPayments: [
                { amount: '100.00', paidAt: new Date('2026-11-01T01:00:00Z') }, // outubro
                { amount: '89.90', paidAt: new Date('2026-11-10T15:00:00Z') },
                { amount: '10.10', paidAt: new Date('2026-11-20T15:00:00Z') },
                { amount: '50', paidAt: new Date('2026-06-01T15:00:00Z') }, // fora da janela
                { amount: '70', paidAt: null },
            ],
            newMembers: [{ createdAt: new Date('2026-09-05T12:00:00Z') }, { createdAt: new Date('2026-11-02T12:00:00Z') }],
            deactivations: [{ deactivatedAt: new Date('2026-10-15T12:00:00Z') }, { deactivatedAt: null }],
        },
        monthOf
    );
    assert.deepEqual(
        s.map((p) => [p.label, p.revenue, p.paymentsPaid, p.newMembers, p.deactivated]),
        [
            ['set/26', 0, 0, 1, 0],
            ['out/26', 100, 1, 0, 1],
            ['nov/26', 100, 2, 1, 0],
        ]
    );
});

test('inadimplentes: agrupa por aluno, dias de atraso pelo vencimento mais antigo, ordena por atraso', () => {
    const m = (name: string) => ({ name, phone: null, memberStatus: 'ACTIVE' });
    const { total, list } = buildDebtors(
        [
            { memberId: 'a', amount: '100', dueDate: '2026-11-01', member: m('Ana') },
            { memberId: 'a', amount: '100', dueDate: '2026-10-01', member: m('Ana') },
            { memberId: 'b', amount: '300', dueDate: '2026-11-16', member: m('Bruno') },
            { memberId: 'c', amount: '80', dueDate: '2026-11-16', member: m('Carla') },
            { memberId: 'd', amount: '90', dueDate: '2026-11-26', member: m('Davi') }, // vence hoje: não está atrasado
        ],
        '2026-11-26',
        2
    );
    assert.equal(total, 3);
    assert.deepEqual(
        list.map((d) => [d.name, d.amount, d.payments, d.oldestDueDate, d.daysLate]),
        [
            ['Ana', 200, 2, '2026-10-01', 56],
            ['Bruno', 300, 1, '2026-11-16', 10],
        ]
    );
});
