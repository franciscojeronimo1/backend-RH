"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = void 0;
const prismaClient_1 = require("../config/prismaClient");
const tenantMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const user = await prismaClient_1.prismaClient.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                organizationId: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        if (!user.organizationId) {
            return res.status(400).json({
                error: 'Usuário não está vinculado a uma organização. Crie ou entre em uma organização primeiro.'
            });
        }
        req.user.organizationId = user.organizationId;
        return next();
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar organização' });
    }
};
exports.tenantMiddleware = tenantMiddleware;
//# sourceMappingURL=tenantMiddleware.js.map