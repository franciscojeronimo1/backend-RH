"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserByIdController = void 0;
const GetUserByIdService_1 = require("../../services/user/GetUserByIdService");
class GetUserByIdController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }
        const { id } = req.params;
        const getUserByIdService = new GetUserByIdService_1.GetUserByIdService();
        const user = await getUserByIdService.execute(id, req.user.id, req.user.role);
        return res.json({ user });
    }
}
exports.GetUserByIdController = GetUserByIdController;
//# sourceMappingURL=GetUserByIdController.js.map