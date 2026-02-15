"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetOrganizationController = void 0;
const GetOrganizationService_1 = require("../../services/organization/GetOrganizationService");
class GetOrganizationController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const getOrganizationService = new GetOrganizationService_1.GetOrganizationService();
        const organization = await getOrganizationService.execute(req.user.organizationId);
        return res.json({ organization });
    }
}
exports.GetOrganizationController = GetOrganizationController;
//# sourceMappingURL=GetOrganizationController.js.map