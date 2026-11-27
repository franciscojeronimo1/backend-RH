import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { GymError } from '../../services/gym/GymError';
import { GymSettingsService } from '../../services/gym/GymSettingsService';
import { GymDashboardService } from '../../services/gym/GymDashboardService';
import { GymMembersService, type MemberFilter } from '../../services/gym/GymMembersService';
import { GymCheckInService } from '../../services/gym/GymCheckInService';
import { GymNotificationService } from '../../services/gym/GymNotificationService';
import { GymEvaluationService } from '../../services/gym/GymEvaluationService';
import { GymMembershipService } from '../../services/gym/GymMembershipService';
import { GymPlansService } from '../../services/gym/GymPlansService';
import { GymPixService } from '../../services/gym/pix/GymPixService';
import { MercadoPagoAccountService } from '../../services/gym/pix/MercadoPagoAccountService';
import { GymMemberImportService } from '../../services/gym/import/GymMemberImportService';

type Handler = (req: Request, res: Response, orgId: string) => Promise<unknown>;

const MEMBER_FILTERS: MemberFilter[] = ['ALL', 'ACTIVE', 'AT_RISK', 'INACTIVE', 'PLAN_EXPIRING', 'PLAN_EXPIRED', 'NO_PLAN'];

/** Garante organização e converte GymError em resposta HTTP com o status certo. */
function gym(fn: Handler) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const orgId = req.user?.organizationId;
        if (!req.user || !orgId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        try {
            return await fn(req, res, orgId);
        } catch (error) {
            if (error instanceof GymError) {
                return res.status(error.status).json({ error: error.message, message: error.message, code: error.code });
            }
            return next(error);
        }
    };
}

const num = (v: unknown) => (v !== undefined && v !== '' ? parseInt(String(v), 10) || undefined : undefined);

export const gymController = {
    getSettings: gym(async (_req, res, orgId) => res.json({ settings: await new GymSettingsService().get(orgId) })),

    updateSettings: gym(async (req, res, orgId) =>
        res.json({
            message: 'Configurações salvas',
            settings: await new GymSettingsService().update(orgId, req.body),
        })
    ),

    dashboard: gym(async (req, res, orgId) =>
        res.json(await new GymDashboardService().execute(orgId, { includeFinance: req.user?.role === 'ADMIN' }))
    ),

    evaluateNow: gym(async (_req, res, orgId) => {
        const summary = await new GymEvaluationService().evaluateOrganization(orgId);
        return res.json({ message: 'Análise concluída', summary });
    }),

    listMembers: gym(async (req, res, orgId) => {
        const filterRaw = String(req.query.status ?? 'ALL').toUpperCase() as MemberFilter;
        const filter = MEMBER_FILTERS.includes(filterRaw) ? filterRaw : 'ALL';
        return res.json(
            await new GymMembersService().list(orgId, {
                filter,
                search: typeof req.query.search === 'string' ? req.query.search : undefined,
                page: num(req.query.page),
                limit: num(req.query.limit),
            })
        );
    }),

    createMember: gym(async (req, res, orgId) => {
        const { planId, startDate, ...data } = req.body;
        const memberships = new GymMembershipService();
        if (planId) await memberships.assertPlan(orgId, planId);
        const created = await new GymMembersService().create(orgId, data);
        if (planId) {
            const result = await memberships.create(orgId, created.id, { planId, startDate }, req.user?.id);
            return res.status(201).json({ message: 'Aluno cadastrado', member: result.member });
        }
        return res.status(201).json({ message: 'Aluno cadastrado', member: created });
    }),

    previewImport: gym(async (req, res, orgId) => res.json(await new GymMemberImportService().preview(orgId, req.body))),

    commitImport: gym(async (req, res, orgId) =>
        res.json(await new GymMemberImportService().commit(orgId, req.body, req.user?.id))
    ),

    deleteMember: gym(async (req, res, orgId) => res.json(await new GymMembersService().remove(orgId, String(req.params.id)))),

    listMemberships: gym(async (req, res, orgId) =>
        res.json(await new GymMembershipService().list(orgId, String(req.params.id)))
    ),

    createMembership: gym(async (req, res, orgId) =>
        res
            .status(201)
            .json(await new GymMembershipService().create(orgId, String(req.params.id), req.body, req.user?.id))
    ),

    cancelMembership: gym(async (req, res, orgId) =>
        res.json(await new GymMembershipService().cancel(orgId, String(req.params.membershipId)))
    ),

    listMemberPayments: gym(async (req, res, orgId) =>
        res.json(await new GymMembershipService().listPayments(orgId, String(req.params.id)))
    ),

    payPayment: gym(async (req, res, orgId) =>
        res.json(await new GymMembershipService().pay(orgId, String(req.params.paymentId), req.body, req.user?.id))
    ),

    chargePix: gym(async (req, res, orgId) => res.json(await new GymPixService().charge(orgId, String(req.params.paymentId)))),

    pixStatus: gym(async (req, res, orgId) => res.json(await new GymPixService().status(orgId, String(req.params.paymentId)))),

    mercadoPagoStatus: gym(async (_req, res, orgId) => res.json(await new MercadoPagoAccountService().status(orgId))),

    mercadoPagoAuthorize: gym(async (req, res, orgId) =>
        res.json(await new MercadoPagoAccountService().authorize(orgId, req.user?.id ?? null))
    ),

    mercadoPagoDisconnect: gym(async (_req, res, orgId) => res.json(await new MercadoPagoAccountService().disconnect(orgId))),

    cancelPayment: gym(async (req, res, orgId) =>
        res.json(await new GymMembershipService().cancelPayment(orgId, String(req.params.paymentId)))
    ),

    listPlans: gym(async (req, res, orgId) =>
        res.json(await new GymPlansService().list(orgId, req.query.active === 'true'))
    ),

    createPlan: gym(async (req, res, orgId) =>
        res.status(201).json({ message: 'Plano criado', plan: await new GymPlansService().create(orgId, req.body) })
    ),

    updatePlan: gym(async (req, res, orgId) =>
        res.json({ message: 'Plano atualizado', plan: await new GymPlansService().update(orgId, String(req.params.planId), req.body) })
    ),

    getMember: gym(async (req, res, orgId) => res.json(await new GymMembersService().get(orgId, String(req.params.id)))),

    updateMember: gym(async (req, res, orgId) =>
        res.json({
            message: 'Aluno atualizado',
            member: await new GymMembersService().update(orgId, String(req.params.id), req.body),
        })
    ),

    deactivateMember: gym(async (req, res, orgId) =>
        res.json({
            message: 'Aluno desativado',
            member: await new GymMembersService().deactivate(orgId, String(req.params.id)),
        })
    ),

    reactivateMember: gym(async (req, res, orgId) =>
        res.json({
            message: 'Aluno reativado',
            member: await new GymMembersService().reactivate(orgId, String(req.params.id), req.user?.role === 'ADMIN'),
        })
    ),

    createCheckIn: gym(async (req, res, orgId) => {
        const result = await new GymCheckInService().register(orgId, req.body.memberId, req.user?.id);
        return res.status(result.alreadyCheckedIn ? 200 : 201).json(result);
    }),

    listCheckIns: gym(async (req, res, orgId) =>
        res.json(
            await new GymCheckInService().list(orgId, typeof req.query.date === 'string' ? req.query.date : undefined)
        )
    ),

    deleteCheckIn: gym(async (req, res, orgId) =>
        res.json(await new GymCheckInService().remove(orgId, String(req.params.id)))
    ),

    listNotifications: gym(async (req, res, orgId) =>
        res.json(
            await new GymNotificationService().list(orgId, {
                unreadOnly: req.query.unreadOnly === 'true',
                page: num(req.query.page),
                limit: num(req.query.limit),
            })
        )
    ),

    unreadCount: gym(async (_req, res, orgId) =>
        res.json({ unreadCount: await new GymNotificationService().unreadCount(orgId) })
    ),

    markNotificationRead: gym(async (req, res, orgId) =>
        res.json(await new GymNotificationService().markRead(orgId, String(req.params.id)))
    ),

    markAllNotificationsRead: gym(async (_req, res, orgId) =>
        res.json(await new GymNotificationService().markAllRead(orgId))
    ),
};

/**
 * Endpoint para cron externo (ex.: Vercel Cron, cron-job.org) quando o backend roda em serverless.
 * Exige header Authorization: Bearer <CRON_SECRET>.
 */
/**
 * Rotina diária das academias. Chamado pelo Vercel Cron (vercel.json → GET /gym/cron, 06:00 UTC = 03:00 de Brasília),
 * que envia sozinho "Authorization: Bearer <CRON_SECRET>". Idempotente: rodar de novo no mesmo dia não duplica avisos.
 */
export async function gymCronHandler(req: Request, res: Response) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
        return res.status(503).json({ error: 'CRON_SECRET não configurado no servidor' });
    }
    const expected = Buffer.from(`Bearer ${secret}`);
    const given = Buffer.from(String(req.headers.authorization ?? '').trim());
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    const startedAt = Date.now();
    const results = await new GymEvaluationService().evaluateAll();
    // Renova tokens do Mercado Pago que vencem em breve (não trava a rotina se falhar)
    const mercadoPago = await new MercadoPagoAccountService().refreshExpiring().catch((e) => {
        console.error('[mercadopago] Falha ao renovar tokens no cron:', e instanceof Error ? e.message : e);
        return { refreshed: 0, failed: -1 };
    });
    const totals = results.reduce(
        (t, r) => ({
            evaluated: t.evaluated + r.evaluated,
            becameAtRisk: t.becameAtRisk + r.becameAtRisk,
            deactivated: t.deactivated + r.deactivated,
            notificationsCreated: t.notificationsCreated + r.notificationsCreated,
        }),
        { evaluated: 0, becameAtRisk: 0, deactivated: 0, notificationsCreated: 0 }
    );
    const durationMs = Date.now() - startedAt;
    console.log(
        `[academia] Cron: ${results.length} academia(s), ${totals.evaluated} aluno(s) avaliados, ` +
            `${totals.becameAtRisk} em risco, ${totals.deactivated} desativado(s), ${totals.notificationsCreated} aviso(s) em ${durationMs}ms`
    );
    return res.json({ message: 'Rotina de alunos executada', organizations: results.length, durationMs, totals, mercadoPago, results });
}

/** Webhook do Mercado Pago (público; a segurança é a assinatura x-signature + consulta na API). */
export async function gymPixWebhookHandler(req: Request, res: Response) {
    const q = req.query as Record<string, unknown>;
    const body = (req.body ?? {}) as { type?: string; topic?: string; user_id?: string | number; data?: { id?: string | number } };
    const dataId = String(q['data.id'] ?? q.id ?? body.data?.id ?? '') || undefined;
    const type = String(q.type ?? q.topic ?? body.type ?? body.topic ?? '') || undefined;
    try {
        const result = await new GymPixService().handleWebhook({
            dataId,
            type,
            mpUserId: body.user_id !== undefined && body.user_id !== null ? String(body.user_id) : undefined,
            xSignature: req.header('x-signature'),
            xRequestId: req.header('x-request-id'),
        });
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error('[pix] Erro no webhook do Mercado Pago:', error instanceof Error ? error.message : error);
        // 500 faz o Mercado Pago tentar de novo mais tarde
        return res.status(500).json({ error: 'Erro ao processar notificação' });
    }
}

/** Volta do "Conectar Mercado Pago" (público: o navegador do dono chega aqui vindo do MP). Redireciona para o front. */
export async function mercadoPagoCallbackHandler(req: Request, res: Response) {
    const q = req.query as Record<string, unknown>;
    const url = await new MercadoPagoAccountService().handleCallback({
        code: typeof q.code === 'string' ? q.code : undefined,
        state: typeof q.state === 'string' ? q.state : undefined,
        error: typeof q.error === 'string' ? q.error : undefined,
    });
    return res.redirect(302, url);
}
