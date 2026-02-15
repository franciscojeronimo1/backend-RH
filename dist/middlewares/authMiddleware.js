"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }
        const parts = authHeader.split(" ");
        if (parts.length !== 2) {
            return res.status(401).json({ error: "Token inválido" });
        }
        const [scheme, token = ""] = parts;
        if (!scheme || !/^Bearer$/i.test(scheme)) {
            return res.status(401).json({ error: "Token mal formatado" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res
                .status(500)
                .json({ error: "Erro de configuração do servidor" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        return next();
    }
    catch (error) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=authMiddleware.js.map