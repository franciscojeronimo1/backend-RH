"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
        }
        return next();
    };
};
exports.roleMiddleware = roleMiddleware;
//# sourceMappingURL=roleMiddleware.js.map