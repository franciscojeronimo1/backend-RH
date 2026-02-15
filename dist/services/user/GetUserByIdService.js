"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserByIdService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class GetUserByIdService {
    async execute(id, currentUserId, currentUserRole) {
        const user = await prismaClient_1.prismaClient.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }
        if (currentUserRole === 'STAFF' && user.id !== currentUserId) {
            throw new Error('Você não tem permissão para visualizar este usuário');
        }
        return user;
    }
}
exports.GetUserByIdService = GetUserByIdService;
//# sourceMappingURL=GetUserByIdService.js.map