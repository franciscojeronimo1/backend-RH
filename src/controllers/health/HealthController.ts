import { Request, Response } from 'express';
import { pool } from '../../config/prismaClient';

/**
 * GET /health - Verifica se a API e o banco estão respondendo.
 * Pode ser chamado pelo front no carregamento do app para "aquecer" a conexão
 * com o banco (Neon scale-to-zero), evitando timeout nas próximas requisições.
 */
class HealthController {
    async handle(_req: Request, res: Response) {
        try {
            await pool.query('SELECT 1');
            return res.status(200).json({ status: 'ok', database: 'connected' });
        } catch (error) {
            console.error('Health check failed:', error);
            return res.status(503).json({ status: 'unavailable', database: 'disconnected' });
        }
    }
}

export { HealthController };
