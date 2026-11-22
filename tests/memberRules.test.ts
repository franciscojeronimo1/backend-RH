import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMember, DEFAULT_GYM_SETTINGS, type MemberSnapshot } from '../src/services/gym/memberRules';

const NOW = new Date('2026-11-21T15:00:00-03:00');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const ymdUtc = (offsetDays: number) => {
    const d = new Date(Date.UTC(2026, 10, 21 + offsetDays));
    return d;
};

function member(overrides: Partial<MemberSnapshot> = {}): MemberSnapshot {
    return {
        id: 'm1',
        name: 'Ana',
        memberStatus: 'ACTIVE',
        autoControl: true,
        lastCheckInAt: daysAgo(1),
        activeSince: null,
        createdAt: daysAgo(100),
        planName: null,
        planExpiresAt: null,
        ...overrides,
    };
}

const S = DEFAULT_GYM_SETTINGS;

test('aluno que treinou ontem continua ativo e sem avisos', () => {
    const r = evaluateMember(member(), S, NOW);
    assert.equal(r.nextStatus, 'ACTIVE');
    assert.equal(r.statusChanged, false);
    assert.equal(r.notifications.length, 0);
    assert.equal(r.daysAbsent, 1);
});

test('7 dias sem treinar => em risco com aviso', () => {
    const r = evaluateMember(member({ lastCheckInAt: daysAgo(7) }), S, NOW);
    assert.equal(r.nextStatus, 'AT_RISK');
    assert.equal(r.statusChanged, true);
    assert.equal(r.notifications[0]?.type, 'MEMBER_AT_RISK');
});

test('30 dias sem treinar => desativado automaticamente', () => {
    const r = evaluateMember(member({ memberStatus: 'AT_RISK', lastCheckInAt: daysAgo(30) }), S, NOW);
    assert.equal(r.nextStatus, 'INACTIVE');
    assert.equal(r.deactivationReason, 'AUTO_ABSENCE');
    assert.equal(r.notifications[0]?.type, 'MEMBER_DEACTIVATED');
});

test('autoDeactivate desligado => fica em risco, não desativa', () => {
    const r = evaluateMember(member({ lastCheckInAt: daysAgo(60) }), { ...S, autoDeactivate: false }, NOW);
    assert.equal(r.nextStatus, 'AT_RISK');
});

test('idempotente: mesma avaliação gera as mesmas dedupeKeys', () => {
    const m = member({ lastCheckInAt: daysAgo(10) });
    const a = evaluateMember(m, S, NOW);
    const b = evaluateMember({ ...m, memberStatus: 'AT_RISK' }, S, new Date(NOW.getTime() + 3 * 3600_000));
    assert.deepEqual(
        a.notifications.map((n) => n.dedupeKey),
        b.notifications.map((n) => n.dedupeKey)
    );
    assert.equal(b.statusChanged, false);
});

test('reativado manualmente (activeSince recente) não é desativado de novo', () => {
    const r = evaluateMember(member({ lastCheckInAt: daysAgo(90), activeSince: daysAgo(2) }), S, NOW);
    assert.equal(r.nextStatus, 'ACTIVE');
    assert.equal(r.daysAbsent, 2);
});

test('sem presença nenhuma conta a partir do cadastro', () => {
    const r = evaluateMember(member({ lastCheckInAt: null, createdAt: daysAgo(8) }), S, NOW);
    assert.equal(r.nextStatus, 'AT_RISK');
});

test('em risco que voltou (presença recente) volta para ativo', () => {
    const r = evaluateMember(member({ memberStatus: 'AT_RISK', lastCheckInAt: daysAgo(0) }), S, NOW);
    assert.equal(r.nextStatus, 'ACTIVE');
    assert.equal(r.statusChanged, true);
});

test('inativo ou com controle automático desligado não muda', () => {
    for (const m of [
        member({ memberStatus: 'INACTIVE', lastCheckInAt: daysAgo(100) }),
        member({ autoControl: false, lastCheckInAt: daysAgo(100) }),
    ]) {
        const r = evaluateMember(m, S, NOW);
        assert.equal(r.statusChanged, false);
        assert.equal(r.notifications.length, 0);
    }
});

test('plano vencendo em 3 dias gera aviso PLAN_EXPIRING', () => {
    const r = evaluateMember(member({ planName: 'Mensal', planExpiresAt: ymdUtc(3) }), S, NOW);
    assert.equal(r.daysToPlanExpiry, 3);
    assert.equal(r.notifications[0]?.type, 'PLAN_EXPIRING');
    assert.match(r.notifications[0]!.title, /vence em 3 dias/);
});

test('plano vence hoje', () => {
    const r = evaluateMember(member({ planExpiresAt: ymdUtc(0) }), S, NOW);
    assert.equal(r.daysToPlanExpiry, 0);
    assert.match(r.notifications[0]!.title, /vence hoje/);
});

test('plano vencido gera PLAN_EXPIRED e, se configurado, desativa após carência', () => {
    const m = member({ planExpiresAt: ymdUtc(-10) });
    const r1 = evaluateMember(m, S, NOW);
    assert.equal(r1.notifications[0]?.type, 'PLAN_EXPIRED');
    assert.equal(r1.nextStatus, 'ACTIVE');

    const r2 = evaluateMember(m, { ...S, deactivateOnPlanExpired: true, planExpiredGraceDays: 5 }, NOW);
    assert.equal(r2.nextStatus, 'INACTIVE');
    assert.equal(r2.deactivationReason, 'AUTO_PLAN_EXPIRED');

    const r3 = evaluateMember(m, { ...S, deactivateOnPlanExpired: true, planExpiredGraceDays: 15 }, NOW);
    assert.equal(r3.nextStatus, 'ACTIVE');
});

test('virada do dia usa fuso de São Paulo (presença às 23h conta como o dia certo)', () => {
    const last = new Date('2026-11-14T23:30:00-03:00'); // 02:30 UTC do dia 15
    const r = evaluateMember(member({ lastCheckInAt: last }), S, NOW);
    assert.equal(r.daysAbsent, 7);
    assert.equal(r.nextStatus, 'AT_RISK');
});

import { planEndYmd, addToYmd } from '../src/services/gym/gymDates';

test('vencimento do plano: mensal começando 15/01 vale até 14/02; trimestral; diária', () => {
    assert.equal(planEndYmd('2026-01-15', 1, 0), '2026-02-14');
    assert.equal(planEndYmd('2026-01-15', 3, 0), '2026-04-14');
    assert.equal(planEndYmd('2026-11-21', 0, 1), '2026-11-21');
    assert.equal(addToYmd('2026-12-31', 0, 1), '2027-01-01');
});
