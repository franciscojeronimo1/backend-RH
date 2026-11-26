import cron from 'node-cron';
import { GymEvaluationService } from '../services/gym/GymEvaluationService';
import { APP_TIMEZONE } from '../utils/dateUtils';

/** Na inicialização só reavalia academias que não foram avaliadas na última hora (evita repetir a cada restart). */
const STARTUP_MIN_INTERVAL_MS = 60 * 60 * 1000;
const STARTUP_DELAY_MS = 15_000;

let running = false;

async function run(reason: string, minIntervalMs?: number) {
    if (running) return;
    running = true;
    const startedAt = Date.now();
    try {
        const results = await new GymEvaluationService().evaluateAll({ minIntervalMs });
        const done = results.filter((r) => !r.skipped);
        const deactivated = done.reduce((s, r) => s + r.deactivated, 0);
        const atRisk = done.reduce((s, r) => s + r.becameAtRisk, 0);
        console.log(
            `[academia] Rotina (${reason}) concluída em ${Date.now() - startedAt}ms: ` +
                `${done.length} academia(s), ${atRisk} em risco, ${deactivated} desativado(s).`
        );
    } catch (error) {
        console.error('[academia] Erro na rotina automática de alunos:', error);
    } finally {
        running = false;
    }
}

/**
 * Agenda a rotina automática de alunos:
 *  - todo dia às 06:00 e às 18:00 (horário de Brasília);
 *  - uma vez logo após o servidor subir.
 * Desative com GYM_SCHEDULER_DISABLED=true (ex.: quando usar o endpoint /gym/cron com cron externo).
 */
export function startGymScheduler() {
    if (process.env.GYM_SCHEDULER_DISABLED === 'true') {
        console.log('[academia] Agendador desativado por GYM_SCHEDULER_DISABLED=true');
        return;
    }
    // Na Vercel (serverless) o processo não fica ligado: quem roda a rotina é o Vercel Cron (vercel.json → /gym/cron).
    if (process.env.VERCEL) {
        console.log('[academia] Agendador interno desligado na Vercel (rotina via Vercel Cron)');
        return;
    }
    cron.schedule('0 6,18 * * *', () => void run('agendada'), { timezone: APP_TIMEZONE });
    const t = setTimeout(() => void run('inicialização', STARTUP_MIN_INTERVAL_MS), STARTUP_DELAY_MS);
    t.unref();
    console.log('[academia] Agendador de alunos ativo (06:00 e 18:00, America/Sao_Paulo)');
}
