"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCheckoutController = void 0;
const CreateCheckoutService_1 = require("../../services/subscription/CreateCheckoutService");
const prismaClient_1 = require("../../config/prismaClient");
class CreateCheckoutController {
    async handle(req, res) {
        const organizationId = req.user?.organizationId;
        const userEmail = req.user?.email;
        if (!organizationId || !userEmail) {
            return res.status(400).json({
                error: 'Organização ou email não identificados',
            });
        }
        const user = await prismaClient_1.prismaClient.user.findUnique({
            where: { id: req.user.id },
            select: { name: true },
        });
        const service = new CreateCheckoutService_1.CreateCheckoutService();
        const result = await service.execute(organizationId, userEmail, user?.name ?? undefined);
        return res.json(result);
    }
}
exports.CreateCheckoutController = CreateCheckoutController;
//# sourceMappingURL=CreateCheckoutController.js.map