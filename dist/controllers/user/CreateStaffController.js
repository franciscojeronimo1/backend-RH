"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStaffController = void 0;
const CreateStaffService_1 = require("../../services/user/CreateStaffService");
class CreateStaffController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { name, email, password } = req.body;
        const adminId = req.user.id;
        const createStaffService = new CreateStaffService_1.CreateStaffService();
        const result = await createStaffService.execute(adminId, name, email, password);
        return res.status(201).json({
            message: 'Usuário STAFF criado com sucesso',
            user: result.user,
            token: result.token
        });
    }
}
exports.CreateStaffController = CreateStaffController;
//# sourceMappingURL=CreateStaffController.js.map