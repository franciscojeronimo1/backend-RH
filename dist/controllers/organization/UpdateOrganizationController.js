"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOrganizationController = void 0;
const UpdateOrganizationService_1 = require("../../services/organization/UpdateOrganizationService");
class UpdateOrganizationController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { name, cnpj, email, phone, address } = req.body;
        const updateOrganizationService = new UpdateOrganizationService_1.UpdateOrganizationService();
        const organization = await updateOrganizationService.execute(req.user.organizationId, { name, cnpj, email, phone, address });
        return res.json({
            message: 'Organização atualizada com sucesso',
            organization,
        });
    }
}
exports.UpdateOrganizationController = UpdateOrganizationController;
//# sourceMappingURL=UpdateOrganizationController.js.map