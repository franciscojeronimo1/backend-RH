"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListUsersController = void 0;
const ListUsersService_1 = require("../../services/user/ListUsersService");
class ListUsersController {
    async handle(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const listUsersService = new ListUsersService_1.ListUsersService();
        const users = await listUsersService.execute(req.user.role, req.user.id);
        return res.json({ users });
    }
}
exports.ListUsersController = ListUsersController;
//# sourceMappingURL=ListUsersController.js.map