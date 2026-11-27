import { prismaClient } from '../../../config/prismaClient';
import { GymError } from '../GymError';
import { GymNotificationService } from '../GymNotificationService';
import { dbDateToYmd } from '../gymDates';
import {
    MercadoPagoClient,
    MercadoPagoError,
    decideSettlement,
    externalReferenceFor,
    paymentIdFromReference,
    readMpConfig,
    verifyMpSignature,
    type FetchLike,
    type MpConfig,
    type MpPayment,
} from './mercadoPago';
import { MercadoPagoAccountService, type MpCredentials } from './MercadoPagoAccountService';

/** De onde vem o token do MP: conta da academia (OAuth) ou global (teste). Injetável nos testes. */
export interface MpCredentialProvider {
    credentialsFor(organizationId: string): Promise<MpCredentials | null>;
    credentialsForMpUser(mpUserId: string): Promise<MpCredentials[]>;
    globalCredentials(): MpCredentials | null;
}

/** Reaproveita a cobrança se ainda faltar pelo menos isso para expirar. */
const REUSE_MIN_REMAINING_MS = 10 * 60 * 1000;

const money = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brDate = (ymd: string | null) => (ymd ? ymd.split('-').reverse().join('/') : '');
const isEmail = (s: string | null | undefined): s is string => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

type PaymentWithMember = NonNullable<Awaited<ReturnType<GymPixService['loadPayment']>>>;

export function pixToJson(p: {
    id: string;
    status: string;
    amount: { toString(): string };
    dueDate: Date;
    externalPaymentId: string | null;
    pixStatus: string | null;
    pixAmount: { toString(): string } | null;
    pixQrCode: string | null;
    pixQrCodeBase64: string | null;
    pixTicketUrl: string | null;
    pixExpiresAt: Date | null;
    paidAt: Date | null;
}) {
    return {
        paymentId: p.id,
        paymentStatus: p.status,
        amount: money(p.pixAmount) ?? money(p.amount),
        dueDate: dbDateToYmd(p.dueDate),
        paidAt: p.paidAt,
        pix: p.externalPaymentId
            ? {
                  id: p.externalPaymentId,
                  status: p.pixStatus,
                  qrCode: p.pixQrCode,
                  qrCodeBase64: p.pixQrCodeBase64,
                  ticketUrl: p.pixTicketUrl,
                  expiresAt: p.pixExpiresAt,
              }
            : null,
    };
}

/**
 * Cobrança Pix das mensalidades via Mercado Pago (API de Payments).
 * Configuração global por env (MERCADOPAGO_ACCESS_TOKEN / MERCADOPAGO_WEBHOOK_SECRET); sem token, fica desligada.
 */
export class GymPixService {
    private notifications = new GymNotificationService();

    constructor(
        private config: MpConfig = readMpConfig(),
        private fetchImpl?: FetchLike,
        private credentials: MpCredentialProvider = new MercadoPagoAccountService(undefined, undefined, fetchImpl)
    ) {}

    /** Pix disponível para esta academia (conta MP conectada, ou token global de teste). */
    async isEnabledFor(organizationId: string) {
        return !!(await this.credentials.credentialsFor(organizationId));
    }

    private clientWith(creds: MpCredentials) {
        return new MercadoPagoClient(
            { accessToken: creds.accessToken, apiBase: this.config.apiBase, notificationUrl: this.config.notificationUrl },
            this.fetchImpl
        );
    }

    private async clientFor(organizationId: string) {
        const creds = await this.credentials.credentialsFor(organizationId);
        if (!creds) {
            throw new GymError(
                'Conecte a conta Mercado Pago da academia em Regras automáticas › Recebimento por Pix para cobrar via Pix.',
                503,
                'PIX_DISABLED'
            );
        }
        return { client: this.clientWith(creds), creds };
    }

    private loadPayment(where: { id: string; organizationId?: string }) {
        return prismaClient.payment.findFirst({
            where,
            include: {
                member: { select: { id: true, name: true, email: true, cpf: true } },
                organization: { select: { name: true } },
            },
        });
    }

    /** Gera (ou reaproveita) a cobrança Pix de uma mensalidade pendente. */
    async charge(organizationId: string, paymentId: string) {
        const { client } = await this.clientFor(organizationId);
        const p = await this.loadPayment({ id: paymentId, organizationId });
        if (!p) throw new GymError('Mensalidade não encontrada', 404);
        if (p.status !== 'PENDING') throw new GymError('Esta mensalidade não está pendente', 400);
        const amount = money(p.amount) ?? 0;
        if (amount <= 0) throw new GymError('Mensalidade sem valor: ajuste o valor antes de cobrar', 400);

        const now = Date.now();
        const reusable =
            p.externalPaymentId &&
            p.pixStatus === 'pending' &&
            p.pixQrCode &&
            p.pixExpiresAt &&
            p.pixExpiresAt.getTime() - now > REUSE_MIN_REMAINING_MS &&
            money(p.pixAmount) === amount;
        if (reusable) return { reused: true, ...pixToJson(p) };

        // Cobrança anterior vencida/valor diferente: tenta cancelar no MP (se falhar, o webhook ainda dá baixa se for paga)
        if (p.externalPaymentId && p.pixStatus === 'pending') {
            await client.cancelPayment(p.externalPaymentId).catch(() => undefined);
        }

        const [firstName, ...rest] = p.member.name.trim().split(/\s+/);
        const cpf = p.member.cpf && /^\d{11}$/.test(p.member.cpf) ? p.member.cpf : null;
        const email = isEmail(p.member.email)
            ? p.member.email
            : (this.config.defaultPayerEmail ?? `aluno-${p.member.id.slice(0, 8)}@gestaocgs.com`);
        let mp: MpPayment;
        try {
            mp = await client.createPix({
                amount,
                description: `Mensalidade ${p.organization.name} - venc. ${brDate(dbDateToYmd(p.dueDate))}`,
                externalReference: externalReferenceFor(p.id),
                // Mesma chave = mesma cobrança no MP (clique duplo não gera dois Pix)
                idempotencyKey: `gym-pix-${p.id}-${Math.round(amount * 100)}-${p.externalPaymentId ?? 'first'}`,
                expiresAt: new Date(now + this.config.expirationMinutes * 60_000),
                payer: { email, firstName, lastName: rest.join(' ') || undefined, cpf },
            });
        } catch (error) {
            if (error instanceof MercadoPagoError) {
                console.error('[pix] Erro ao criar cobrança no Mercado Pago:', error.status, JSON.stringify(error.body));
                throw new GymError(
                    error.status === 401 || error.status === 403
                        ? 'O Mercado Pago recusou o acesso desta academia. Conecte a conta Mercado Pago de novo.'
                        : `Não foi possível gerar o Pix no Mercado Pago: ${error.message}`,
                    502,
                    'PIX_PROVIDER_ERROR'
                );
            }
            throw error;
        }

        const td = mp.point_of_interaction?.transaction_data ?? {};
        if (!td.qr_code) throw new GymError('O Mercado Pago não devolveu o código Pix. Tente de novo.', 502, 'PIX_PROVIDER_ERROR');
        const updated = await prismaClient.payment.update({
            where: { id: p.id },
            data: {
                externalPaymentId: String(mp.id),
                pixStatus: mp.status,
                pixAmount: amount,
                pixQrCode: td.qr_code,
                pixQrCodeBase64: td.qr_code_base64 ?? null,
                pixTicketUrl: td.ticket_url ?? null,
                pixExpiresAt: mp.date_of_expiration ? new Date(mp.date_of_expiration) : new Date(now + this.config.expirationMinutes * 60_000),
            },
        });
        return { reused: false, ...pixToJson(updated) };
    }

    /** Situação da cobrança. Se ainda pendente, confere no MP (cobre webhook atrasado/perdido). */
    async status(organizationId: string, paymentId: string) {
        let p = await this.loadPayment({ id: paymentId, organizationId });
        if (!p) throw new GymError('Mensalidade não encontrada', 404);
        const creds = await this.credentials.credentialsFor(organizationId);
        if (creds && p.status === 'PENDING' && p.externalPaymentId && p.pixStatus === 'pending') {
            try {
                const mp = await this.clientWith(creds).getPayment(p.externalPaymentId);
                await this.applyMpPayment(mp, creds);
                p = (await this.loadPayment({ id: paymentId, organizationId }))!;
            } catch (error) {
                console.error('[pix] Falha ao consultar pagamento no Mercado Pago:', error instanceof Error ? error.message : error);
            }
        }
        return { enabled: !!creds, ...pixToJson(p) };
    }

    /**
     * Webhook do Mercado Pago. Valida x-signature, consulta o pagamento na API (nunca confia no corpo)
     * e dá baixa na mensalidade. Idempotente.
     */
    async handleWebhook(input: {
        dataId: string | undefined;
        type: string | undefined;
        mpUserId?: string | undefined;
        xSignature: string | undefined;
        xRequestId: string | undefined;
    }): Promise<{ status: number; body: Record<string, unknown> }> {
        if (!this.config.webhookSecret) {
            return { status: 503, body: { error: 'MERCADOPAGO_WEBHOOK_SECRET não configurado' } };
        }
        if (!verifyMpSignature({ ...input, secret: this.config.webhookSecret })) {
            return { status: 401, body: { error: 'Assinatura inválida' } };
        }
        if (input.type && input.type !== 'payment') return { status: 200, body: { ignored: `tipo ${input.type}` } };
        if (!input.dataId) return { status: 200, body: { ignored: 'sem data.id' } };

        // Descobre de qual academia é: 1) mensalidade com esse id do MP; 2) contas com o user_id da notificação; 3) token global (teste)
        const candidates: MpCredentials[] = [];
        const local = await prismaClient.payment.findFirst({
            where: { externalPaymentId: input.dataId },
            select: { organizationId: true },
        });
        if (local) {
            const c = await this.credentials.credentialsFor(local.organizationId);
            if (c) candidates.push(c);
        }
        if (input.mpUserId) candidates.push(...(await this.credentials.credentialsForMpUser(input.mpUserId)));
        const g = this.credentials.globalCredentials();
        if (g) candidates.push(g);
        const seen = new Set<string>();
        const unique = candidates.filter((c) => (seen.has(c.accessToken) ? false : (seen.add(c.accessToken), true)));
        if (unique.length === 0) return { status: 200, body: { ignored: 'nenhuma conta conectada para esta notificação' } };

        for (const creds of unique) {
            let mp: MpPayment;
            try {
                mp = await this.clientWith(creds).getPayment(input.dataId);
            } catch (error) {
                // 404/401/403 = o pagamento não é desta conta: tenta a próxima
                if (error instanceof MercadoPagoError && [401, 403, 404].includes(error.status)) continue;
                throw error;
            }
            const result = await this.applyMpPayment(mp, creds);
            return { status: 200, body: { ok: true, result } };
        }
        // Ex.: simulação do painel (id inexistente). 200 para o MP não reenviar.
        return { status: 200, body: { ignored: 'pagamento não encontrado no Mercado Pago' } };
    }

    /** Aplica o estado do pagamento do MP na mensalidade correspondente (por external_reference). */
    async applyMpPayment(mp: MpPayment, creds?: MpCredentials): Promise<string> {
        const localId = paymentIdFromReference(mp.external_reference);
        if (!localId) return 'ignored:not-ours';
        const p = await this.loadPayment({ id: localId });
        if (!p) return 'ignored:payment-not-found';
        // Pagamento lido com o token de uma academia só pode baixar mensalidade dessa academia
        if (creds?.source === 'oauth' && creds.organizationId !== p.organizationId) return 'ignored:other-organization';
        const mpId = String(mp.id);
        const isCurrent = p.externalPaymentId === mpId;

        const decision = decideSettlement(mp, {
            status: p.status,
            amount: money(p.amount) ?? 0,
            pixAmount: isCurrent ? money(p.pixAmount) : null,
        });

        if (decision.kind === 'settle') {
            const res = await prismaClient.payment.updateMany({
                where: { id: p.id, status: 'PENDING' },
                data: {
                    status: 'PAID',
                    paidAt: mp.date_approved ? new Date(mp.date_approved) : new Date(),
                    method: 'PIX',
                    receivedById: null,
                    externalPaymentId: mpId,
                    pixStatus: 'approved',
                },
            });
            if (res.count === 1) {
                await this.notify(p, 'PAYMENT_RECEIVED', `PIX_PAID:${mpId}`, 'Pix recebido',
                    `${p.member.name} pagou ${brl(mp.transaction_amount)} da mensalidade com vencimento em ${brDate(dbDateToYmd(p.dueDate))}.`);
                return 'settled';
            }
            return 'already-settled';
        }

        if (isCurrent && p.pixStatus !== mp.status) {
            await prismaClient.payment.update({ where: { id: p.id }, data: { pixStatus: mp.status } });
        }

        if (decision.kind === 'already-paid') {
            if (isCurrent) return 'already-settled';
            await this.notify(p, 'PAYMENT_ISSUE', `PIX_DUP:${mpId}`, 'Pix recebido em mensalidade já paga',
                `${p.member.name} pagou ${brl(mp.transaction_amount)} via Pix numa mensalidade que já estava paga. Confira se precisa devolver no Mercado Pago.`);
            return 'duplicate';
        }
        if (decision.kind === 'not-pending') {
            await this.notify(p, 'PAYMENT_ISSUE', `PIX_CANCELLED:${mpId}`, 'Pix recebido em mensalidade cancelada',
                `${p.member.name} pagou ${brl(mp.transaction_amount)} via Pix numa mensalidade cancelada. Confira no Mercado Pago.`);
            return 'not-pending';
        }
        if (decision.kind === 'amount-mismatch') {
            await this.notify(p, 'PAYMENT_ISSUE', `PIX_AMOUNT:${mpId}`, 'Pix com valor diferente',
                `${p.member.name} pagou ${brl(decision.received)} via Pix, mas a mensalidade é ${brl(decision.expected)}. A baixa não foi feita.`);
            return 'amount-mismatch';
        }
        return `ignored:${decision.mpStatus}`;
    }

    /** Ao dar baixa manual ou cancelar a mensalidade, cancela o Pix em aberto no MP (sem travar se falhar). */
    async cancelActivePixQuietly(paymentId: string) {
        const p = await prismaClient.payment.findUnique({
            where: { id: paymentId },
            select: { externalPaymentId: true, pixStatus: true, organizationId: true },
        });
        if (!p?.externalPaymentId || p.pixStatus !== 'pending') return;
        try {
            const creds = await this.credentials.credentialsFor(p.organizationId);
            if (!creds) return;
            await this.clientWith(creds).cancelPayment(p.externalPaymentId);
            await prismaClient.payment.update({ where: { id: paymentId }, data: { pixStatus: 'cancelled' } });
        } catch (error) {
            console.error('[pix] Não foi possível cancelar o Pix no Mercado Pago:', error instanceof Error ? error.message : error);
        }
    }

    private notify(p: PaymentWithMember, type: 'PAYMENT_RECEIVED' | 'PAYMENT_ISSUE', dedupeKey: string, title: string, message: string) {
        return this.notifications.createMany(p.organizationId, [{ type, dedupeKey, title, message, memberId: p.memberId }]);
    }
}
