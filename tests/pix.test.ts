import './helpers/noDbEnv';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
    MercadoPagoClient,
    MercadoPagoError,
    decideSettlement,
    externalReferenceFor,
    mpDate,
    paymentIdFromReference,
    readMpConfig,
    verifyMpSignature,
    type FetchLike,
} from '../src/services/gym/pix/mercadoPago';
import { GymPixService, type MpCredentialProvider } from '../src/services/gym/pix/GymPixService';

const SECRET = 'segredo-webhook';
const sign = (manifest: string) => createHmac('sha256', SECRET).update(manifest).digest('hex');

test('assinatura x-signature válida (manifesto id;request-id;ts) e data.id alfanumérico em minúsculas', () => {
    const v1 = sign('id:abc123;request-id:req-1;ts:1704908010;');
    assert.equal(verifyMpSignature({ xSignature: `ts=1704908010,v1=${v1}`, xRequestId: 'req-1', dataId: 'ABC123', secret: SECRET }), true);
    // espaços e ordem diferente no header
    assert.equal(verifyMpSignature({ xSignature: ` v1=${v1} , ts=1704908010`, xRequestId: 'req-1', dataId: 'abc123', secret: SECRET }), true);
});

test('assinatura inválida: outro segredo, outro id, header faltando ou malformado', () => {
    const v1 = sign('id:123;request-id:req-1;ts:1;');
    assert.equal(verifyMpSignature({ xSignature: `ts=1,v1=${v1}`, xRequestId: 'req-1', dataId: '124', secret: SECRET }), false);
    assert.equal(verifyMpSignature({ xSignature: `ts=1,v1=${v1}`, xRequestId: 'req-1', dataId: '123', secret: 'outro' }), false);
    assert.equal(verifyMpSignature({ xSignature: undefined, xRequestId: 'req-1', dataId: '123', secret: SECRET }), false);
    assert.equal(verifyMpSignature({ xSignature: 'lixo', xRequestId: 'req-1', dataId: '123', secret: SECRET }), false);
    // sem x-request-id a parte é omitida do manifesto
    const v1b = sign('id:123;ts:1;');
    assert.equal(verifyMpSignature({ xSignature: `ts=1,v1=${v1b}`, xRequestId: undefined, dataId: '123', secret: SECRET }), true);
});

test('config: token global é opcional (modo teste); expiração limitada a 30 min..30 dias', () => {
    assert.equal(readMpConfig({}).accessToken, null);
    const c = readMpConfig({ MERCADOPAGO_ACCESS_TOKEN: ' APP_USR-x ', MERCADOPAGO_PIX_EXPIRATION_MINUTES: '5' })!;
    assert.equal(c.accessToken, 'APP_USR-x');
    assert.equal(c.expirationMinutes, 30);
    assert.equal(c.apiBase, 'https://api.mercadopago.com');
    assert.equal(c.webhookSecret, null);
    assert.equal(readMpConfig({ MERCADOPAGO_ACCESS_TOKEN: 'x' })!.expirationMinutes, 4320);
});

test('referência externa e data no fuso de Brasília', () => {
    assert.equal(paymentIdFromReference(externalReferenceFor('p-1')), 'p-1');
    assert.equal(paymentIdFromReference('outra-coisa'), null);
    assert.equal(mpDate(new Date('2026-11-30T12:00:00Z')), '2026-11-30T09:00:00.000-03:00');
});

function mockFetch(responses: Array<{ status: number; body: unknown }>) {
    const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: unknown }> = [];
    const fn: FetchLike = async (url, init) => {
        calls.push({ url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
        const r = responses.shift() ?? { status: 500, body: { message: 'sem resposta' } };
        return { ok: r.status < 400, status: r.status, json: async () => r.body };
    };
    return { fn, calls };
}

test('createPix monta a requisição certa (pix, idempotência, payer, expiração, sem rede real)', async () => {
    const { fn, calls } = mockFetch([
        { status: 201, body: { id: 999, status: 'pending', transaction_amount: 99.9, point_of_interaction: { transaction_data: { qr_code: '000201...', qr_code_base64: 'iVBOR' } } } },
    ]);
    const client = new MercadoPagoClient({ accessToken: 'TOKEN', apiBase: 'https://mp.fake', notificationUrl: null }, fn);
    const r = await client.createPix({
        amount: 99.899999,
        description: 'Mensalidade',
        externalReference: 'gym-payment:p1',
        idempotencyKey: 'chave-1',
        expiresAt: new Date('2026-11-30T12:00:00Z'),
        payer: { email: 'a@b.com', firstName: 'Ana', lastName: 'Silva', cpf: '12345678909' },
    });
    assert.equal(r.id, 999);
    const c = calls[0]!;
    assert.equal(c.url, 'https://mp.fake/v1/payments');
    assert.equal(c.method, 'POST');
    assert.equal(c.headers.Authorization, 'Bearer TOKEN');
    assert.equal(c.headers['X-Idempotency-Key'], 'chave-1');
    assert.deepEqual(c.body, {
        transaction_amount: 99.9,
        description: 'Mensalidade',
        payment_method_id: 'pix',
        external_reference: 'gym-payment:p1',
        date_of_expiration: '2026-11-30T09:00:00.000-03:00',
        payer: { email: 'a@b.com', first_name: 'Ana', last_name: 'Silva', identification: { type: 'CPF', number: '12345678909' } },
    });
});

test('erro da API vira MercadoPagoError com status', async () => {
    const { fn } = mockFetch([{ status: 401, body: { message: 'invalid access token' } }]);
    const client = new MercadoPagoClient({ accessToken: 'x', apiBase: 'https://mp.fake', notificationUrl: null }, fn);
    await assert.rejects(client.getPayment(1), (e: unknown) => e instanceof MercadoPagoError && e.status === 401 && /invalid/.test(e.message));
});

test('decisão de baixa: só aprovado + pendente + valor suficiente', () => {
    const local = { status: 'PENDING', amount: 100, pixAmount: 100 };
    assert.deepEqual(decideSettlement({ status: 'approved', transaction_amount: 100 }, local), { kind: 'settle' });
    assert.deepEqual(decideSettlement({ status: 'pending', transaction_amount: 100 }, local), { kind: 'ignore', mpStatus: 'pending' });
    assert.deepEqual(decideSettlement({ status: 'approved', transaction_amount: 100 }, { ...local, status: 'PAID' }), { kind: 'already-paid' });
    assert.deepEqual(decideSettlement({ status: 'approved', transaction_amount: 100 }, { ...local, status: 'CANCELLED' }), { kind: 'not-pending', localStatus: 'CANCELLED' });
    assert.equal(decideSettlement({ status: 'approved', transaction_amount: 99.99 }, local).kind, 'amount-mismatch');
});

const noCreds: MpCredentialProvider = {
    credentialsFor: async () => null,
    credentialsForMpUser: async () => [],
    globalCredentials: () => null,
};

test('webhook: 503 sem segredo, 401 com assinatura errada, outro tópico ignorado (sem consultar a API)', async () => {
    const { fn, calls } = mockFetch([]);
    const base = readMpConfig({ MERCADOPAGO_API_BASE: 'https://mp.fake' });
    const noSecret = new GymPixService(base, fn, noCreds);
    assert.equal((await noSecret.handleWebhook({ dataId: '1', type: 'payment', xSignature: 'x', xRequestId: 'y' })).status, 503);

    const svc = new GymPixService({ ...base, webhookSecret: SECRET }, fn, noCreds);
    const bad = await svc.handleWebhook({ dataId: '1', type: 'payment', xSignature: `ts=1,v1=${'0'.repeat(64)}`, xRequestId: 'y' });
    assert.equal(bad.status, 401);
    const v1 = sign('id:1;request-id:y;ts:1;');
    const other = await svc.handleWebhook({ dataId: '1', type: 'merchant_order', xSignature: `ts=1,v1=${v1}`, xRequestId: 'y' });
    assert.equal(other.status, 200);
    assert.equal(calls.length, 0);
});

test('academia sem conta conectada (e sem token global): Pix desligado e cobrar dá 503 pedindo para conectar', async () => {
    const svc = new GymPixService(readMpConfig({}), undefined, noCreds);
    assert.equal(await svc.isEnabledFor('org'), false);
    await assert.rejects(svc.charge('org', 'p'), (e: unknown) => (e as { status?: number }).status === 503 && /Conecte a conta Mercado Pago/.test(String((e as Error).message)));
});
