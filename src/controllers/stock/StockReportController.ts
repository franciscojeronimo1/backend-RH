import { Request, Response } from 'express';
import { StockReportService } from '../../services/stock/StockReportService';

class StockReportController {
    async getLowStock(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { page, limit } = req.query;
        const stockReportService = new StockReportService();
        const result = await stockReportService.getLowStockProducts(
            req.user.organizationId,
            {
                page: page ? parseInt(String(page), 10) : undefined,
                limit: limit ? parseInt(String(limit), 10) : undefined,
            }
        );

        return res.json(result);
    }

    async getDailyUsage(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { date } = req.query;
        const stockReportService = new StockReportService();
        const usage = await stockReportService.getDailyUsage(
            req.user.organizationId,
            date as string | undefined
        );

        return res.json(usage);
    }

    async getWeeklyUsage(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { startDate } = req.query;
        const stockReportService = new StockReportService();
        const usage = await stockReportService.getWeeklyUsage(
            req.user.organizationId,
            startDate as string | undefined
        );

        return res.json(usage);
    }

    async getTotalValue(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const stockReportService = new StockReportService();
        const value = await stockReportService.getTotalStockValue(req.user.organizationId);

        return res.json(value);
    }

    async getCurrentStock(req: Request, res: Response) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }

        const { category, page, limit } = req.query;
        const stockReportService = new StockReportService();
        const result = await stockReportService.getCurrentStock(
            req.user.organizationId,
            category as string | undefined,
            {
                page: page ? parseInt(String(page), 10) : undefined,
                limit: limit ? parseInt(String(limit), 10) : undefined,
            }
        );

        return res.json(result);
    }
}

export { StockReportController };


