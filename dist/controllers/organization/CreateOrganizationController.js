"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrganizationController = void 0;
const CreateOrganizationService_1 = require("../../services/organization/CreateOrganizationService");
class CreateOrganizationController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { name, cnpj, email, phone, address } = req.body;
        const createOrganizationService = new CreateOrganizationService_1.CreateOrganizationService();
        const organization = await createOrganizationService.execute(name, req.user.id, cnpj, email, phone, address);
        return res.status(201).json({
            message: 'Organização criada com sucesso',
            organization,
        });
    }
}
exports.CreateOrganizationController = CreateOrganizationController;
//# sourceMappingURL=CreateOrganizationController.js.map