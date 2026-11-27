import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import {
    MpOAuthClient,
    buildAuthorizationUrl,
    decryptSecret,
    deriveKey,
    encryptSecret,
    pkceFor,
    readOAuthConfig,
    signState,
    verifyState,
} from '../src/services/gym/pix/mpOAuth';
import type { FetchLike } from '../src/services/gym/pix/mercadoPago';

const KEY = deriveKey('a'.repeat(64));
const ENV = {
    MERCADOPAGO_CLIENT_ID: '123456',
    MERCADOPAGO_CLIENT_SECRET: 'segredo-app',
    MERCADOPAGO_REDIRECT_URI: 'https://backend.test/gym/mercadopago/callback',
    MERCADOPAGO_TOKEN_ENCRYPTION_KEY: 'b'.repeat(64),
    FRONTEND_URL: 'https://gestaocgs.com/',
};

test('config OAuth: exige client id/secret/redirect/chave; PKCE ligado por padrão; volta para configurações', () => {
    assert.equal(readOAuthConfig({}), null);
    assert.equal(readOAuthConfig({ ...ENV, MERCADOPAGO_TOKEN_ENCRYPTION_KEY: '' }), null);
    const c = readOAuthConfig(ENV)!;
    assert.equal(c.pkce, true);
    assert.equal(c.authBase, 'https://auth.mercadopago.com.br');
    assert.equal(c.returnUrl, 'https://gestaocgs.com/academia/configuracoes');
    assert.equal(c.encryptionKey.length, 32);
    assert.equal(readOAuthConfig({ ...ENV, MERCADOPAGO_OAUTH_PKCE: 'false' })!.pkce, false);
});

test('chave: hex de 64, base64 de 32 bytes ou texto (SHA-256) sempre vira 32 bytes', () => {
    assert.equal(deriveKey('f'.repeat(64)).toString('hex'), 'f'.repeat(64));
    const b64 = Buffer.alloc(32, 7).toString('base64');
    assert.deepEqual(deriveKey(b64), Buffer.alloc(32, 7));
    assert.equal(deriveKey('uma frase qualquer bem longa').length, 32);
});

test('tokens criptografados com AES-256-GCM: ida e volta, IV aleatório, adulteração e chave errada falham', () => {
    const enc1 = encryptSecret('APP_USR-token-secreto', KEY);
    const enc2 = encryptSecret('APP_USR-token-secreto', KEY);
    assert.notEqual(enc1, enc2);
    assert.ok(!enc1.includes('APP_USR'));
    assert.equal(decryptSecret(enc1, KEY), 'APP_USR-token-secreto');
    const parts = enc1.split('.');
    const tampered = [...parts.slice(0, 3), parts[3]!.slice(0, -2) + (parts[3]!.endsWith('AA') ? 'BB' : 'AA')].join('.');
    assert.throws(() => decryptSecret(tampered, KEY));
    assert.throws(() => decryptSecret(enc1, deriveKey('c'.repeat(64))));
});

test('state assinado: liga à academia, expira e não aceita adulteração', () => {
    const now = 1_000_000;
    const st = signState({ organizationId: 'org-1', userId: 'u-1', nonce: 'n1', expiresAt: now + 600_000 }, KEY);
    assert.deepEqual(verifyState(st, KEY, now), { organizationId: 'org-1', userId: 'u-1', nonce: 'n1', expiresAt: now + 600_000 });
    assert.equal(verifyState(st, KEY, now + 600_001), null, 'expirado');
    assert.equal(verifyState(st, deriveKey('d'.repeat(64)), now), null, 'outra chave');
    const [body, sig] = st.split('.');
    const forged = Buffer.from(JSON.stringify({ o: 'org-2', u: 'u-1', n: 'n1', e: now + 600_000 })).toString('base64url');
    assert.equal(verifyState(`${forged}.${sig}`, KEY, now), null, 'trocar a academia invalida a assinatura');
    assert.equal(verifyState(`${body}`, KEY, now), null);
    assert.equal(verifyState(undefined, KEY, now), null);
});

test('PKCE S256: verifier de 43 chars derivado do nonce e challenge = BASE64URL(SHA256(verifier))', () => {
    const { verifier, challenge } = pkceFor('nonce-x', KEY);
    assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(challenge, createHash('sha256').update(verifier).digest('base64url'));
    assert.equal(pkceFor('nonce-x', KEY).verifier, verifier, 'determinístico (não precisa guardar)');
    assert.notEqual(pkceFor('nonce-y', KEY).verifier, verifier);
});

test('URL de autorização com client_id, redirect, state e PKCE', () => {
    const c = readOAuthConfig(ENV)!;
    const u = new URL(buildAuthorizationUrl(c, 'STATE', 'CHAL'));
    assert.equal(u.origin + u.pathname, 'https://auth.mercadopago.com.br/authorization');
    assert.equal(u.searchParams.get('client_id'), '123456');
    assert.equal(u.searchParams.get('response_type'), 'code');
    assert.equal(u.searchParams.get('platform_id'), 'mp');
    assert.equal(u.searchParams.get('redirect_uri'), ENV.MERCADOPAGO_REDIRECT_URI);
    assert.equal(u.searchParams.get('state'), 'STATE');
    assert.equal(u.searchParams.get('code_challenge'), 'CHAL');
    assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(new URL(buildAuthorizationUrl(c, 'S', null)).searchParams.has('code_challenge'), false);
});

test('/oauth/token: troca do code (com code_verifier) e refresh, com fetch mockado', async () => {
    const calls: Array<{ url: string; body: Record<string, string> }> = [];
    const replies = [
        { status: 200, body: { access_token: 'APP_USR-a', refresh_token: 'TG-r', user_id: 777, expires_in: 15552000, public_key: 'APP_USR-pk', live_mode: true } },
        { status: 200, body: { access_token: 'APP_USR-b', refresh_token: 'TG-r2', user_id: 777, expires_in: 15552000 } },
        { status: 400, body: { message: 'invalid_grant', error: 'invalid_grant' } },
    ];
    const fn: FetchLike = async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body!) });
        const r = replies.shift()!;
        return { ok: r.status < 400, status: r.status, json: async () => r.body };
    };
    const c = new MpOAuthClient({ clientId: '123', clientSecret: 's', redirectUri: 'https://r', apiBase: 'https://mp.fake' }, fn);
    const t = await c.exchangeCode('TG-code', 'VERIFIER');
    assert.equal(t.user_id, 777);
    assert.equal(calls[0]!.url, 'https://mp.fake/oauth/token');
    assert.deepEqual(calls[0]!.body, { client_id: '123', client_secret: 's', grant_type: 'authorization_code', code: 'TG-code', redirect_uri: 'https://r', code_verifier: 'VERIFIER' });
    await c.refresh('TG-r');
    assert.deepEqual(calls[1]!.body, { client_id: '123', client_secret: 's', grant_type: 'refresh_token', refresh_token: 'TG-r' });
    await assert.rejects(c.refresh('TG-velho'), (e: unknown) => (e as { status?: number }).status === 400);
});
