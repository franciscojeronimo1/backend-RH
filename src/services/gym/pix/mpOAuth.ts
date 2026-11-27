/**
 * OAuth do Mercado Pago (cada academia conecta a própria conta) + criptografia dos tokens.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { MercadoPagoError, type FetchLike } from './mercadoPago';

export interface MpOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    encryptionKey: Buffer;
    authBase: string;
    apiBase: string;
    /** PKCE (S256). Ligado por padrão; habilite também na aplicação do MP. MERCADOPAGO_OAUTH_PKCE=false desliga. */
    pkce: boolean;
    /** Para onde o navegador volta depois do callback (tela de configurações da academia). */
    returnUrl: string;
}

/** Aceita 64 hex ou base64 de 32 bytes; qualquer outro texto vira SHA-256 dele (use um valor longo e aleatório). */
export function deriveKey(raw: string): Buffer {
    const v = raw.trim();
    if (/^[0-9a-f]{64}$/i.test(v)) return Buffer.from(v, 'hex');
    const b = Buffer.from(v, 'base64');
    if (b.length === 32 && /^[A-Za-z0-9+/=_-]+$/.test(v)) return b;
    return createHash('sha256').update(v).digest();
}

/** Sem client id/secret/redirect/chave de criptografia, o "Conectar Mercado Pago" fica indisponível (null). */
export function readOAuthConfig(env: NodeJS.ProcessEnv = process.env): MpOAuthConfig | null {
    const clientId = env.MERCADOPAGO_CLIENT_ID?.trim();
    const clientSecret = env.MERCADOPAGO_CLIENT_SECRET?.trim();
    const redirectUri = env.MERCADOPAGO_REDIRECT_URI?.trim();
    const key = env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY?.trim();
    if (!clientId || !clientSecret || !redirectUri || !key) return null;
    const front = (env.FRONTEND_URL?.trim() || 'https://gestaocgs.com').replace(/\/+$/, '');
    return {
        clientId,
        clientSecret,
        redirectUri,
        encryptionKey: deriveKey(key),
        authBase: (env.MERCADOPAGO_AUTH_BASE?.trim() || 'https://auth.mercadopago.com.br').replace(/\/+$/, ''),
        apiBase: (env.MERCADOPAGO_API_BASE?.trim() || 'https://api.mercadopago.com').replace(/\/+$/, ''),
        pkce: env.MERCADOPAGO_OAUTH_PKCE?.trim().toLowerCase() !== 'false',
        returnUrl: env.MERCADOPAGO_RETURN_URL?.trim() || `${front}/academia/configuracoes`,
    };
}

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// ---------- Criptografia dos tokens (AES-256-GCM) ----------

export function encryptSecret(plain: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `v1.${b64url(iv)}.${b64url(cipher.getAuthTag())}.${b64url(enc)}`;
}

export function decryptSecret(payload: string, key: Buffer): string {
    const [v, iv, tag, enc] = payload.split('.');
    if (v !== 'v1' || !iv || !tag || enc === undefined) throw new Error('Token criptografado em formato desconhecido');
    const decipher = createDecipheriv('aes-256-gcm', key, fromB64url(iv));
    decipher.setAuthTag(fromB64url(tag));
    return Buffer.concat([decipher.update(fromB64url(enc)), decipher.final()]).toString('utf8');
}

// ---------- state assinado + PKCE ----------

const subKey = (key: Buffer, purpose: string) => createHmac('sha256', key).update(purpose).digest();

export interface OAuthState {
    organizationId: string;
    userId: string | null;
    nonce: string;
    expiresAt: number;
}

export function signState(state: OAuthState, key: Buffer): string {
    const body = b64url(Buffer.from(JSON.stringify({ o: state.organizationId, u: state.userId, n: state.nonce, e: state.expiresAt })));
    const sig = b64url(createHmac('sha256', subKey(key, 'mp-oauth-state')).update(body).digest());
    return `${body}.${sig}`;
}

/** Confere assinatura e validade. Retorna null se inválido/expirado. */
export function verifyState(raw: string | undefined, key: Buffer, now = Date.now()): OAuthState | null {
    if (!raw) return null;
    const [body, sig] = raw.split('.');
    if (!body || !sig) return null;
    const expected = b64url(createHmac('sha256', subKey(key, 'mp-oauth-state')).update(body).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
        const p = JSON.parse(fromB64url(body).toString('utf8')) as { o?: string; u?: string | null; n?: string; e?: number };
        if (!p.o || !p.n || typeof p.e !== 'number' || p.e < now) return null;
        return { organizationId: p.o, userId: p.u ?? null, nonce: p.n, expiresAt: p.e };
    } catch {
        return null;
    }
}

/** code_verifier derivado do nonce (não precisa guardar): 43 caracteres base64url; challenge = BASE64URL(SHA256(verifier)). */
export function pkceFor(nonce: string, key: Buffer) {
    const verifier = b64url(createHmac('sha256', subKey(key, 'mp-oauth-pkce')).update(nonce).digest());
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
}

export function buildAuthorizationUrl(config: MpOAuthConfig, state: string, codeChallenge: string | null): string {
    const u = new URL(`${config.authBase}/authorization`);
    u.searchParams.set('client_id', config.clientId);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('platform_id', 'mp');
    u.searchParams.set('state', state);
    u.searchParams.set('redirect_uri', config.redirectUri);
    if (codeChallenge) {
        u.searchParams.set('code_challenge', codeChallenge);
        u.searchParams.set('code_challenge_method', 'S256');
    }
    return u.toString();
}

// ---------- Cliente /oauth/token ----------

export interface MpTokenResponse {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    user_id: number | string;
    refresh_token?: string;
    public_key?: string;
    live_mode?: boolean;
}

export class MpOAuthClient {
    constructor(
        private config: Pick<MpOAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri' | 'apiBase'>,
        private fetchImpl: FetchLike = fetch as unknown as FetchLike
    ) {}

    private async token(body: Record<string, string>): Promise<MpTokenResponse> {
        const res = await this.fetchImpl(`${this.config.apiBase}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ client_id: this.config.clientId, client_secret: this.config.clientSecret, ...body }),
        });
        const json = (await res.json().catch(() => null)) as (MpTokenResponse & { message?: string; error?: string }) | null;
        if (!res.ok || !json?.access_token) {
            throw new MercadoPagoError(json?.message || json?.error || `Mercado Pago respondeu ${res.status}`, res.status, json);
        }
        return json;
    }

    exchangeCode(code: string, codeVerifier: string | null) {
        return this.token({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.redirectUri,
            ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
        });
    }

    refresh(refreshToken: string) {
        return this.token({ grant_type: 'refresh_token', refresh_token: refreshToken });
    }

    /** Dados da conta (apelido/e-mail) para mostrar "conta conectada". Opcional. */
    async me(accessToken: string): Promise<{ id?: number; nickname?: string; email?: string } | null> {
        try {
            const res = await this.fetchImpl(`${this.config.apiBase}/users/me`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return res.ok ? ((await res.json()) as { id?: number; nickname?: string; email?: string }) : null;
        } catch {
            return null;
        }
    }
}
