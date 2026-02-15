"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteUserService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class DeleteUserService {
    async execute(id, currentUserId) {
        if (id === currentUserId) {
            throw new Error('Você não pode deletar sua própria conta');
        }
        const user = await prismaClient_1.prismaClient.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new Error('Usuário não encontrado');
        }
        await prismaClient_1.prismaClient.user.delete({
            where: { id },
        });
        return { message: 'Usuário deletado com sucesso' };
    }
}
exports.DeleteUserService = DeleteUserService;
//# sourceMappingURL=DeleteUserService.js.map