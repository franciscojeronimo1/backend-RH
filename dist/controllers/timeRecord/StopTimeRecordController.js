"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopTimeRecordController = void 0;
const StopTimeRecordService_1 = require("../../services/timeRecord/StopTimeRecordService");
class StopTimeRecordController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const stopTimeRecordService = new StopTimeRecordService_1.StopTimeRecordService();
        const result = await stopTimeRecordService.execute(req.user.id);
        return res.status(201).json(result);
    }
}
exports.StopTimeRecordController = StopTimeRecordController;
//# sourceMappingURL=StopTimeRecordController.js.map