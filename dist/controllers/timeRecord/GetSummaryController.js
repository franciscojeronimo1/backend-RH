"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSummaryController = void 0;
const ListTimeRecordsService_1 = require("../../services/timeRecord/ListTimeRecordsService");
class GetSummaryController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { userId, date } = req.query;
        const listTimeRecordsService = new ListTimeRecordsService_1.ListTimeRecordsService();
        const result = await listTimeRecordsService.execute(req.user.id, userId, date);
        return res.json({ summary: result.summary });
    }
}
exports.GetSummaryController = GetSummaryController;
//# sourceMappingURL=GetSummaryController.js.map