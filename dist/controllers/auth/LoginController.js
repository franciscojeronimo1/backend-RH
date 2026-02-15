"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginController = void 0;
const LoginService_1 = require("../../services/auth/LoginService");
class LoginController {
    async handle(req, res) {
        const { email, password } = req.body;
        const loginService = new LoginService_1.LoginService();
        const result = await loginService.execute(email, password);
        return res.json({ message: 'Login realizado com sucesso', ...result });
    }
}
exports.LoginController = LoginController;
//# sourceMappingURL=LoginController.js.map