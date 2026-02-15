"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserController = void 0;
const UpdateUserService_1 = require("../../services/user/UpdateUserService");
class UpdateUserController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }
        const { id } = req.params;
        const { name, email, password, role } = req.body;
        const updateUserService = new UpdateUserService_1.UpdateUserService();
        const user = await updateUserService.execute(id, { name, email, password, role }, req.user.id, req.user.role);
        return res.json({ message: "Usuário atualizado com sucesso", user });
    }
}
exports.UpdateUserController = UpdateUserController;
//# sourceMappingURL=UpdateUserController.js.map