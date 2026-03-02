"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSubscriptionController = void 0;
const GetSubscriptionService_1 = require("../../services/subscription/GetSubscriptionService");
class GetSubscriptionController {
    async handle(req, res) {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                error: 'Organização não identificada',
            });
        }
        const service = new GetSubscriptionService_1.GetSubscriptionService();
        const subscription = await service.execute(organizationId);
        return res.json(subscription);
    }
}
exports.GetSubscriptionController = GetSubscriptionController;
//# sourceMappingURL=GetSubscriptionController.js.map