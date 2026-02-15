"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserController = void 0;
const CreateUserService_1 = require("../../services/user/CreateUserService");
class CreateUserController {
    async handle(req, res) {
        const { name, email, password, organizationName } = req.body;
        const createUserService = new CreateUserService_1.CreateUserService();
        const result = await createUserService.execute(name, email, password, organizationName);
        return res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: result.user,
            organization: result.organization,
            token: result.token
        });
    }
}
exports.CreateUserController = CreateUserController;
//# sourceMappingURL=CreateUserController.js.map