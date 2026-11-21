import { Request, Response, NextFunction } from 'express';
import { GymError } from '../../services/gym/GymError';
import { GymSettingsService } from '../../services/gym/GymSettingsService';
import { GymDashboardService } from '../../services/gym/GymDashboardService';
import { GymMembersService, type MemberFilter } from '../../services/gym/GymMembersService';
import { GymCheckInService } from '../../services/gym/GymCheckInService';
import { GymNotificationService } from '../../services/gym/GymNotificationService';
import { GymEvaluationService } from '../../services/gym/GymEvaluationService';

type Handler = (req: Request, res: Response, orgId: string) => Promise<unknown>;

const MEMBER_FILTERS: MemberFilter[] = ['ALL', 'ACTIVE', 'AT_RISK', 'INACTIVE', 'PLAN_EXPIRING', 'PLAN_EXPIRED'];

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

    dashboard: gym(async (_req, res, orgId) => res.json(await new GymDashboardService().execute(orgId))),

    evaluateNow: gym(async (_req, res, orgId) => {
        const summary = await new GymEvaluationService().evaluateOrganization(orgId);
        if (summary.skipped === 'DISABLED') {
            throw new GymError('Ative o módulo Academia nas configurações primeiro.', 400, 'GYM_DISABLED');
        }
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
            member: await new GymMembersService().reactivate(orgId, String(req.params.id)),
        })
    ),

    createCheckIn: gym(async (req, res, orgId) => {
        const result = await new GymCheckInService().register(orgId, req.body.clientId, req.user?.id);
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
export async function gymCronHandler(req: Request, res: Response) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return res.status(503).json({ error: 'CRON_SECRET não configurado no servidor' });
    }
    if (req.headers.authorization !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    const results = await new GymEvaluationService().evaluateAll();
    return res.json({ message: 'Rotina de alunos executada', organizations: results.length, results });
}
