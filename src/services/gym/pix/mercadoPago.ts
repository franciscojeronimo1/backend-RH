/**
 * Cliente mínimo da API de Payments do Mercado Pago (Pix), com fetch injetável para testes.
 * Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */
import { createHmac, timingSafeEqual } from 'crypto';

export interface MpConfig {
    accessToken: string;
    webhookSecret: string | null;
    apiBase: string;
    notificationUrl: string | null;
    expirationMinutes: number;
    defaultPayerEmail: string | null;
}

/** Lê a configuração das envs. Sem MERCADOPAGO_ACCESS_TOKEN a cobrança Pix fica desligada (null). */
export function readMpConfig(env: NodeJS.ProcessEnv = process.env): MpConfig | null {
    const accessToken = env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) return null;
    const minutes = parseInt(env.MERCADOPAGO_PIX_EXPIRATION_MINUTES ?? '', 10);
    return {
        accessToken,
        webhookSecret: env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null,
        // Só para testes locais (servidor falso). Em produção fica o padrão.
        apiBase: (env.MERCADOPAGO_API_BASE?.trim() || 'https://api.mercadopago.com').replace(/\/+$/, ''),
        notificationUrl: env.MERCADOPAGO_NOTIFICATION_URL?.trim() || null,
        // Pix do MP aceita de 30 min a 30 dias. Padrão: 3 dias (dá tempo de o aluno pagar pelo WhatsApp).
        expirationMinutes: Number.isFinite(minutes) ? Math.min(43200, Math.max(30, minutes)) : 3 * 24 * 60,
        defaultPayerEmail: env.MERCADOPAGO_PAYER_EMAIL?.trim() || null,
    };
}

export interface MpPayment {
    id: number | string;
    status: string; // pending | approved | authorized | in_process | in_mediation | rejected | cancelled | refunded | charged_back
    status_detail?: string;
    transaction_amount: number;
    external_reference?: string | null;
    date_approved?: string | null;
    date_of_expiration?: string | null;
    point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
    };
}

export class MercadoPagoError extends Error {
    constructor(
        message: string,
        public status: number,
        public body?: unknown
    ) {
        super(message);
    }
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
}>;

export interface CreatePixInput {
    amount: number;
    description: string;
    externalReference: string;
    idempotencyKey: string;
    expiresAt: Date;
    payer: { email: string; firstName?: string; lastName?: string; cpf?: string | null };
}

/** Data no formato que o MP aceita: 2026-11-30T23:59:59.000-03:00 */
export function mpDate(d: Date): string {
    const local = new Date(d.getTime() - 3 * 3600_000);
    return local.toISOString().replace('Z', '-03:00');
}

export class MercadoPagoClient {
    constructor(
        private config: Pick<MpConfig, 'accessToken' | 'apiBase' | 'notificationUrl'>,
        private fetchImpl: FetchLike = fetch as unknown as FetchLike
    ) {}

    private async request<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
        const res = await this.fetchImpl(`${this.config.apiBase}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        const json = (await res.json().catch(() => null)) as T & { message?: string };
        if (!res.ok) {
            throw new MercadoPagoError(json?.message || `Mercado Pago respondeu ${res.status}`, res.status, json);
        }
        return json;
    }

    createPix(input: CreatePixInput): Promise<MpPayment> {
        const payer: Record<string, unknown> = { email: input.payer.email };
        if (input.payer.firstName) payer.first_name = input.payer.firstName;
        if (input.payer.lastName) payer.last_name = input.payer.lastName;
        if (input.payer.cpf) payer.identification = { type: 'CPF', number: input.payer.cpf };
        return this.request<MpPayment>(
            'POST',
            '/v1/payments',
            {
                transaction_amount: Math.round(input.amount * 100) / 100,
                description: input.description.slice(0, 200),
                payment_method_id: 'pix',
                external_reference: input.externalReference,
                date_of_expiration: mpDate(input.expiresAt),
                payer,
                ...(this.config.notificationUrl ? { notification_url: this.config.notificationUrl } : {}),
            },
            { 'X-Idempotency-Key': input.idempotencyKey }
        );
    }

    getPayment(id: string | number): Promise<MpPayment> {
        return this.request<MpPayment>('GET', `/v1/payments/${encodeURIComponent(String(id))}`);
    }

    cancelPayment(id: string | number): Promise<MpPayment> {
        return this.request<MpPayment>('PUT', `/v1/payments/${encodeURIComponent(String(id))}`, { status: 'cancelled' });
    }
}

/**
 * Valida o header x-signature do webhook do Mercado Pago.
 * Manifesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" assinado com HMAC-SHA256 (hex) usando a chave secreta.
 * Partes ausentes são omitidas; data.id alfanumérico vai em minúsculas.
 */
export function verifyMpSignature(params: {
    xSignature: string | undefined;
    xRequestId: string | undefined;
    dataId: string | undefined;
    secret: string;
}): boolean {
    const { xSignature, xRequestId, dataId, secret } = params;
    if (!xSignature || !secret) return false;
    let ts: string | undefined;
    let v1: string | undefined;
    for (const part of xSignature.split(',')) {
        const [k, ...rest] = part.split('=');
        const key = k?.trim();
        const value = rest.join('=').trim();
        if (key === 'ts') ts = value;
        else if (key === 'v1') v1 = value;
    }
    if (!ts || !v1) return false;
    let manifest = '';
    if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
    if (xRequestId) manifest += `request-id:${xRequestId};`;
    manifest += `ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(v1.toLowerCase());
    return a.length === b.length && timingSafeEqual(a, b);
}

export const EXTERNAL_REF_PREFIX = 'gym-payment:';
export const externalReferenceFor = (paymentId: string) => `${EXTERNAL_REF_PREFIX}${paymentId}`;
export const paymentIdFromReference = (ref: string | null | undefined): string | null =>
    ref && ref.startsWith(EXTERNAL_REF_PREFIX) ? ref.slice(EXTERNAL_REF_PREFIX.length) || null : null;

export type SettlementDecision =
    | { kind: 'settle' }
    | { kind: 'already-paid' }
    | { kind: 'not-pending'; localStatus: string }
    | { kind: 'amount-mismatch'; expected: number; received: number }
    | { kind: 'ignore'; mpStatus: string };

/** Decide o que fazer com a mensalidade dado o pagamento consultado no MP (função pura, testável). */
export function decideSettlement(
    mp: Pick<MpPayment, 'status' | 'transaction_amount'>,
    local: { status: string; amount: number; pixAmount: number | null }
): SettlementDecision {
    if (mp.status !== 'approved') return { kind: 'ignore', mpStatus: mp.status };
    if (local.status === 'PAID') return { kind: 'already-paid' };
    if (local.status !== 'PENDING') return { kind: 'not-pending', localStatus: local.status };
    const expected = local.pixAmount ?? local.amount;
    if (Math.round(mp.transaction_amount * 100) < Math.round(expected * 100)) {
        return { kind: 'amount-mismatch', expected, received: mp.transaction_amount };
    }
    return { kind: 'settle' };
}
