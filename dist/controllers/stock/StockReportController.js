"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockReportController = void 0;
const StockReportService_1 = require("../../services/stock/StockReportService");
class StockReportController {
    async getLowStock(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const stockReportService = new StockReportService_1.StockReportService();
        const products = await stockReportService.getLowStockProducts(req.user.organizationId);
        return res.json({ products });
    }
    async getDailyUsage(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { date } = req.query;
        const stockReportService = new StockReportService_1.StockReportService();
        const usage = await stockReportService.getDailyUsage(req.user.organizationId, date);
        return res.json(usage);
    }
    async getWeeklyUsage(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { startDate } = req.query;
        const stockReportService = new StockReportService_1.StockReportService();
        const usage = await stockReportService.getWeeklyUsage(req.user.organizationId, startDate);
        return res.json(usage);
    }
    async getTotalValue(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const stockReportService = new StockReportService_1.StockReportService();
        const value = await stockReportService.getTotalStockValue(req.user.organizationId);
        return res.json(value);
    }
    async getCurrentStock(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { category } = req.query;
        const stockReportService = new StockReportService_1.StockReportService();
        const products = await stockReportService.getCurrentStock(req.user.organizationId, category);
        return res.json({ products });
    }
}
exports.StockReportController = StockReportController;
//# sourceMappingURL=StockReportController.js.map