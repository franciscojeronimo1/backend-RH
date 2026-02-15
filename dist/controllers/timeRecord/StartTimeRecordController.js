"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartTimeRecordController = void 0;
const StartTimeRecordService_1 = require("../../services/timeRecord/StartTimeRecordService");
class StartTimeRecordController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const startTimeRecordService = new StartTimeRecordService_1.StartTimeRecordService();
        const result = await startTimeRecordService.execute(req.user.id);
        return res.status(201).json(result);
    }
}
exports.StartTimeRecordController = StartTimeRecordController;
//# sourceMappingURL=StartTimeRecordController.js.map