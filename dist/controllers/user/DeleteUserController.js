"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteUserController = void 0;
const DeleteUserService_1 = require("../../services/user/DeleteUserService");
class DeleteUserController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { id } = req.params;
        const deleteUserService = new DeleteUserService_1.DeleteUserService();
        const result = await deleteUserService.execute(id, req.user.id);
        return res.json(result);
    }
}
exports.DeleteUserController = DeleteUserController;
//# sourceMappingURL=DeleteUserController.js.map