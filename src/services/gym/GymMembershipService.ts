import { prismaClient } from '../../config/prismaClient';
import { GymError } from './GymError';
import { GymPlansService } from './GymPlansService';
import { memberDetailSelect, withComputed, type PaymentMethodValue } from './GymMembersService';
import { GymPixService } from './pix/GymPixService';
import { dbDateToYmd, planEndYmd, todayYmd, addToYmd, ymdToDbDate } from './gymDates';

export interface MembershipInput {
    planId?: string;
    planName?: string;
    price?: number;
    startDate?: string;
    endDate?: string;
    paid?: boolean;
    paymentMethod?: PaymentMethodValue;
    notes?: string | null;
}

const money = (v: { toString(): string }) => Number(v.toString());

type MembershipRow = {
    price: { toString(): string };
    startDate: Date;
    endDate: Date;
} & Record<string, unknown>;
const membershipToJson = <T extends MembershipRow>(m: T) => ({
    ...m,
    price: money(m.price),
    startDate: dbDateToYmd(m.startDate),
    endDate: dbDateToYmd(m.endDate),
});

type PaymentRow = { amount: { toString(): string }; dueDate: Date } & Record<string, unknown>;
/** Não manda o QR/copia-e-cola na lista (são grandes); a ficha busca em /gym/payments/:id/pix. */
export const paymentToJson = <T extends PaymentRow>(p: T) => {
    const { pixQrCode: _q, pixQrCodeBase64: _b, pixTicketUrl: _t, pixAmount: _a, ...rest } = p as T & Record<string, unknown>;
    return { ...rest, amount: money(p.amount), dueDate: dbDateToYmd(p.dueDate) };
};

class GymMembershipService {
    /** Valida o plano antes de criar aluno + matrícula (evita aluno criado com matrícula inválida). */
    async assertPlan(organizationId: string, planId: string) {
        const plan = await new GymPlansService().findOrFail(organizationId, planId);
        if (!plan.active) throw new GymError('Este plano está desativado.', 400);
        return plan;
    }

    /**
     * Matricula/renova o aluno. Sem data de início: começa hoje, ou no dia seguinte ao fim
     * do plano atual se ele ainda estiver valendo (renovação antecipada não perde dias).
     * Cria a mensalidade (paga ou pendente) e atualiza o plano vigente do aluno.
     */
    async create(organizationId: string, memberId: string, data: MembershipInput, userId?: string) {
        const member = await prismaClient.member.findFirst({ where: { id: memberId, organizationId } });
        if (!member) throw new GymError('Aluno não encontrado', 404);

        let planName = data.planName?.trim();
        let price = data.price;
        let months = 0;
        let days = 0;
        let planId: string | null = null;
        if (data.planId) {
            const plan = await this.assertPlan(organizationId, data.planId);
            planId = plan.id;
            planName = plan.name;
            price = data.price ?? money(plan.price);
            months = plan.durationMonths;
            days = plan.durationDays;
        }
        if (!planName || price === undefined) throw new GymError('Escolha um plano ou informe nome e valor', 400);

        const today = todayYmd();
        const currentEnd = dbDateToYmd(member.planExpiresAt);
        const startYmd = data.startDate ?? (currentEnd && currentEnd >= today ? addToYmd(currentEnd, 0, 1) : today);
        const endYmd = data.endDate ?? planEndYmd(startYmd, months, days);
        if (endYmd < startYmd) throw new GymError('O vencimento não pode ser antes do início', 400);

        const now = new Date();
        const newPlanEnd = !currentEnd || endYmd > currentEnd ? endYmd : currentEnd;
        const reactivate = member.memberStatus === 'INACTIVE' && member.deactivationReason === 'AUTO_PLAN_EXPIRED';

        const [membership, , updatedMember] = await prismaClient.$transaction(async (tx) => {
            const ms = await tx.membership.create({
                data: {
                    organizationId,
                    memberId,
                    planId,
                    planName,
                    price: price!,
                    startDate: ymdToDbDate(startYmd),
                    endDate: ymdToDbDate(endYmd),
                    notes: data.notes ?? null,
                    createdById: userId ?? null,
                },
            });
            const pay = await tx.payment.create({
                data: {
                    organizationId,
                    memberId,
                    membershipId: ms.id,
                    amount: price!,
                    dueDate: ymdToDbDate(startYmd),
                    ...(data.paid
                        ? { status: 'PAID' as const, paidAt: now, method: data.paymentMethod ?? 'CASH', receivedById: userId ?? null }
                        : {}),
                },
            });
            const m = await tx.member.update({
                where: { id: memberId },
                data: {
                    planName: newPlanEnd === endYmd ? planName : member.planName,
                    planExpiresAt: ymdToDbDate(newPlanEnd),
                    // Desativado só porque o plano venceu: renovar reativa
                    ...(reactivate
                        ? {
                              memberStatus: 'ACTIVE' as const,
                              statusChangedAt: now,
                              activeSince: now,
                              deactivatedAt: null,
                              deactivationReason: null,
                          }
                        : {}),
                },
                select: memberDetailSelect,
            });
            return [ms, pay, m] as const;
        });

        return { membership: membershipToJson(membership), member: withComputed(updatedMember), reactivated: reactivate };
    }

    async list(organizationId: string, memberId: string) {
        const memberships = await prismaClient.membership.findMany({
            where: { organizationId, memberId },
            orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
            take: 50,
        });
        return { memberships: memberships.map(membershipToJson) };
    }

    /** Cancela a matrícula, cancela mensalidades pendentes dela e recalcula o plano vigente do aluno. */
    async cancel(organizationId: string, membershipId: string) {
        const ms = await prismaClient.membership.findFirst({ where: { id: membershipId, organizationId } });
        if (!ms) throw new GymError('Matrícula não encontrada', 404);
        if (ms.status === 'CANCELLED') throw new GymError('Matrícula já cancelada', 400);

        const member = await prismaClient.$transaction(async (tx) => {
            await tx.membership.update({ where: { id: ms.id }, data: { status: 'CANCELLED' } });
            await tx.payment.updateMany({
                where: { organizationId, membershipId: ms.id, status: 'PENDING' },
                data: { status: 'CANCELLED' },
            });
            const latest = await tx.membership.findFirst({
                where: { organizationId, memberId: ms.memberId, status: 'ACTIVE' },
                orderBy: { endDate: 'desc' },
            });
            return tx.member.update({
                where: { id: ms.memberId },
                data: { planName: latest?.planName ?? null, planExpiresAt: latest?.endDate ?? null },
                select: memberDetailSelect,
            });
        });
        return { message: 'Matrícula cancelada', member: withComputed(member) };
    }

    async listPayments(organizationId: string, memberId: string) {
        const payments = await prismaClient.payment.findMany({
            where: { organizationId, memberId },
            orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
            take: 50,
            include: { receivedBy: { select: { id: true, name: true } } },
        });
        return { payments: payments.map(paymentToJson), pixEnabled: new GymPixService().enabled };
    }

    async pay(organizationId: string, paymentId: string, data: { method: PaymentMethodValue; amount?: number }, userId?: string) {
        const p = await prismaClient.payment.findFirst({ where: { id: paymentId, organizationId } });
        if (!p) throw new GymError('Mensalidade não encontrada', 404);
        if (p.status !== 'PENDING') throw new GymError('Esta mensalidade não está pendente', 400);
        const updated = await prismaClient.payment.update({
            where: { id: p.id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                method: data.method,
                ...(data.amount !== undefined ? { amount: data.amount } : {}),
                receivedById: userId ?? null,
            },
        });
        await new GymPixService().cancelActivePixQuietly(p.id);
        return { message: 'Pagamento registrado', payment: paymentToJson(updated) };
    }

    async cancelPayment(organizationId: string, paymentId: string) {
        const p = await prismaClient.payment.findFirst({ where: { id: paymentId, organizationId } });
        if (!p) throw new GymError('Mensalidade não encontrada', 404);
        if (p.status === 'CANCELLED') throw new GymError('Mensalidade já cancelada', 400);
        const updated = await prismaClient.payment.update({ where: { id: p.id }, data: { status: 'CANCELLED' } });
        await new GymPixService().cancelActivePixQuietly(p.id);
        return { message: 'Mensalidade cancelada', payment: paymentToJson(updated) };
    }
}

export { GymMembershipService };
