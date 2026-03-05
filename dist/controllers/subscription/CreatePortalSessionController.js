"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePortalSessionController = void 0;
const CreatePortalSessionService_1 = require("../../services/subscription/CreatePortalSessionService");
class CreatePortalSessionController {
    async handle(req, res) {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                error: 'Organização não identificada',
            });
        }
        const service = new CreatePortalSessionService_1.CreatePortalSessionService();
        const result = await service.execute(organizationId);
        return res.json(result);
    }
}
exports.CreatePortalSessionController = CreatePortalSessionController;
//# sourceMappingURL=CreatePortalSessionController.js.map