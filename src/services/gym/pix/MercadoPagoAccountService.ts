import { randomBytes } from 'crypto';
import { prismaClient } from '../../../config/prismaClient';
import { GymError } from '../GymError';
import { MercadoPagoError, readMpConfig, type FetchLike } from './mercadoPago';
import {
    MpOAuthClient,
    buildAuthorizationUrl,
    decryptSecret,
    encryptSecret,
    pkceFor,
    readOAuthConfig,
    signState,
    verifyState,
    type MpOAuthConfig,
    type MpTokenResponse,
} from './mpOAuth';

/** Tentativa de conexão vale 10 min (o code do MP também vale 10 min). */
const STATE_TTL_MS = 10 * 60 * 1000;
/** Renova o token quando faltar menos que isso (o token do MP vale 180 dias). */
const REFRESH_BEFORE_MS = 15 * 24 * 60 * 60 * 1000;

export interface MpCredentials {
    accessToken: string;
    /** oauth = conta da academia; global = MERCADOPAGO_ACCESS_TOKEN (modo teste) */
    source: 'oauth' | 'global';
    organizationId: string | null;
    mpUserId: string | null;
}

type Connection = NonNullable<Awaited<ReturnType<typeof prismaClient.mercadoPagoConnection.findUnique>>>;

export class MercadoPagoAccountService {
    constructor(
        private oauth: MpOAuthConfig | null = readOAuthConfig(),
        private globalToken: string | null = readMpConfig().accessToken,
        private fetchImpl?: FetchLike
    ) {}

    private client() {
        if (!this.oauth) {
            throw new GymError(
                'A conexão com o Mercado Pago ainda não está disponível no servidor (faltam as credenciais da aplicação).',
                503,
                'MP_OAUTH_DISABLED'
            );
        }
        return new MpOAuthClient(this.oauth, this.fetchImpl);
    }

    private isConnected(c: Connection | null): c is Connection & { accessTokenEnc: string } {
        return !!c?.accessTokenEnc && !!c.connectedAt;
    }

    async status(organizationId: string) {
        const c = await prismaClient.mercadoPagoConnection.findUnique({ where: { organizationId } });
        const connected = this.isConnected(c);
        return {
            /** O servidor tem a aplicação do MP configurada (dá para conectar). */
            available: !!this.oauth,
            connected,
            /** Pix usa o token global de teste porque a academia não conectou. */
            testMode: !connected && !!this.globalToken,
            pixEnabled: connected ? !!this.oauth : !!this.globalToken,
            needsReconnect: connected && !!c?.lastError,
            account: connected
                ? {
                      userId: c!.mpUserId,
                      nickname: c!.mpNickname,
                      email: c!.mpEmail,
                      liveMode: c!.liveMode,
                      connectedAt: c!.connectedAt,
                      expiresAt: c!.expiresAt,
                      lastError: c!.lastError,
                  }
                : null,
        };
    }

    /** Gera a URL de autorização (state assinado ligado à academia, uso único, PKCE). */
    async authorize(organizationId: string, userId: string | null) {
        this.client();
        const cfg = this.oauth!;
        const nonce = randomBytes(18).toString('base64url');
        const expiresAt = Date.now() + STATE_TTL_MS;
        await prismaClient.mercadoPagoConnection.upsert({
            where: { organizationId },
            create: { organizationId, oauthNonce: nonce, oauthNonceExpiresAt: new Date(expiresAt) },
            update: { oauthNonce: nonce, oauthNonceExpiresAt: new Date(expiresAt) },
        });
        const state = signState({ organizationId, userId, nonce, expiresAt }, cfg.encryptionKey);
        const challenge = cfg.pkce ? pkceFor(nonce, cfg.encryptionKey).challenge : null;
        return { url: buildAuthorizationUrl(cfg, state, challenge) };
    }

    /**
     * Callback do MP (navegador do dono). Nunca lança: devolve a URL do front com ?mp=connected ou ?mp=error&motivo=...
     */
    async handleCallback(query: { code?: string; state?: string; error?: string }): Promise<string> {
        const back = (params: Record<string, string>) => {
            const base = this.oauth?.returnUrl ?? 'https://gestaocgs.com/academia/configuracoes';
            const u = new URL(base);
            for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
            return u.toString();
        };
        if (!this.oauth) return back({ mp: 'error', motivo: 'indisponivel' });
        if (query.error) return back({ mp: 'error', motivo: query.error === 'access_denied' ? 'negado' : 'mp' });

        const state = verifyState(query.state, this.oauth.encryptionKey);
        if (!state || !query.code) return back({ mp: 'error', motivo: 'expirado' });

        // Uso único: o nonce precisa ser o da última tentativa desta academia; é consumido aqui
        const consumed = await prismaClient.mercadoPagoConnection.updateMany({
            where: { organizationId: state.organizationId, oauthNonce: state.nonce, oauthNonceExpiresAt: { gt: new Date() } },
            data: { oauthNonce: null, oauthNonceExpiresAt: null },
        });
        if (consumed.count !== 1) return back({ mp: 'error', motivo: 'expirado' });

        try {
            const client = this.client();
            const verifier = this.oauth.pkce ? pkceFor(state.nonce, this.oauth.encryptionKey).verifier : null;
            const token = await client.exchangeCode(query.code, verifier);
            const me = await client.me(token.access_token);
            await prismaClient.mercadoPagoConnection.update({
                where: { organizationId: state.organizationId },
                data: {
                    ...this.tokenData(token),
                    mpNickname: me?.nickname ?? null,
                    mpEmail: me?.email ?? null,
                    connectedAt: new Date(),
                    connectedById: state.userId,
                },
            });
            return back({ mp: 'connected' });
        } catch (error) {
            console.error(
                '[mercadopago] Falha ao trocar o code por token:',
                error instanceof MercadoPagoError ? `${error.status} ${JSON.stringify(error.body)}` : error
            );
            return back({ mp: 'error', motivo: 'token' });
        }
    }

    private tokenData(t: MpTokenResponse) {
        const key = this.oauth!.encryptionKey;
        return {
            mpUserId: String(t.user_id),
            publicKey: t.public_key ?? null,
            liveMode: t.live_mode ?? null,
            scope: t.scope ?? null,
            accessTokenEnc: encryptSecret(t.access_token, key),
            refreshTokenEnc: t.refresh_token ? encryptSecret(t.refresh_token, key) : null,
            expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
            lastRefreshAt: new Date(),
            lastError: null,
        };
    }

    async disconnect(organizationId: string) {
        await prismaClient.mercadoPagoConnection.deleteMany({ where: { organizationId } });
        return { message: 'Mercado Pago desconectado' };
    }

    /** Renova com o refresh_token. Concorrência: só grava se o refresh usado ainda for o atual. */
    private async refresh(c: Connection): Promise<Connection> {
        if (!c.refreshTokenEnc) return c;
        const client = this.client();
        const key = this.oauth!.encryptionKey;
        try {
            const t = await client.refresh(decryptSecret(c.refreshTokenEnc, key));
            // Se outra requisição já renovou (refresh diferente), mantém o que está gravado
            await prismaClient.mercadoPagoConnection.updateMany({
                where: { id: c.id, refreshTokenEnc: c.refreshTokenEnc },
                data: this.tokenData(t),
            });
            return (await prismaClient.mercadoPagoConnection.findUnique({ where: { id: c.id } })) ?? c;
        } catch (error) {
            const msg = error instanceof MercadoPagoError ? `${error.status}: ${error.message}` : String(error);
            console.error('[mercadopago] Falha ao renovar token da academia', c.organizationId, msg);
            // 400/401 = refresh inválido/revogado: pede para reconectar. Outros erros (rede) não marcam.
            if (error instanceof MercadoPagoError && error.status >= 400 && error.status < 500) {
                await prismaClient.mercadoPagoConnection.update({
                    where: { id: c.id },
                    data: { lastError: 'Acesso expirado ou revogado no Mercado Pago. Conecte de novo.' },
                });
            }
            return c;
        }
    }

    private decrypt(c: Connection & { accessTokenEnc: string }): string | null {
        try {
            return decryptSecret(c.accessTokenEnc, this.oauth!.encryptionKey);
        } catch {
            console.error('[mercadopago] Não foi possível descriptografar o token (chave trocada?) da academia', c.organizationId);
            return null;
        }
    }

    /** Token para usar com a conta da academia (renova se estiver perto de expirar). Fallback: token global (teste). */
    async credentialsFor(organizationId: string): Promise<MpCredentials | null> {
        let c = await prismaClient.mercadoPagoConnection.findUnique({ where: { organizationId } });
        if (this.oauth && this.isConnected(c)) {
            if (c.expiresAt && c.expiresAt.getTime() - Date.now() < REFRESH_BEFORE_MS) {
                c = await this.refresh(c);
            }
            if (this.isConnected(c) && (!c.expiresAt || c.expiresAt.getTime() > Date.now())) {
                const accessToken = this.decrypt(c);
                if (accessToken) return { accessToken, source: 'oauth', organizationId, mpUserId: c.mpUserId };
            }
            return null; // conectada mas sem token válido: não cai no global (o Pix iria para a conta errada)
        }
        return this.globalToken ? { accessToken: this.globalToken, source: 'global', organizationId: null, mpUserId: null } : null;
    }

    /** Contas conectadas com esse user_id do MP (para o webhook). */
    async credentialsForMpUser(mpUserId: string): Promise<MpCredentials[]> {
        if (!this.oauth) return [];
        const list = await prismaClient.mercadoPagoConnection.findMany({ where: { mpUserId, accessTokenEnc: { not: null } } });
        const out: MpCredentials[] = [];
        for (const c of list) {
            const creds = await this.credentialsFor(c.organizationId);
            if (creds?.source === 'oauth') out.push(creds);
        }
        return out;
    }

    globalCredentials(): MpCredentials | null {
        return this.globalToken ? { accessToken: this.globalToken, source: 'global', organizationId: null, mpUserId: null } : null;
    }

    /** Rotina diária: renova tokens que vencem nos próximos 15 dias (mesmo sem uso do Pix). */
    async refreshExpiring() {
        if (!this.oauth) return { refreshed: 0, failed: 0 };
        const list = await prismaClient.mercadoPagoConnection.findMany({
            where: {
                accessTokenEnc: { not: null },
                refreshTokenEnc: { not: null },
                lastError: null,
                expiresAt: { lt: new Date(Date.now() + REFRESH_BEFORE_MS) },
            },
        });
        let refreshed = 0;
        let failed = 0;
        for (const c of list) {
            const after = await this.refresh(c);
            if (!after.lastError && after.updatedAt.getTime() > c.updatedAt.getTime()) refreshed++;
            else failed++;
        }
        return { refreshed, failed };
    }
}
