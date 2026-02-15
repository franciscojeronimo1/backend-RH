"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prismaClient_1 = require("../../config/prismaClient");
class UpdateUserService {
    async execute(id, data, currentUserId, currentUserRole) {
        const existingUser = await prismaClient_1.prismaClient.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            throw new Error('Usuário não encontrado');
        }
        if (currentUserRole === 'STAFF') {
            if (id !== currentUserId) {
                throw new Error('Você só pode atualizar seus próprios dados');
            }
            if (data.role) {
                throw new Error('Você não tem permissão para alterar o role');
            }
        }
        if (currentUserRole === 'ADMIN' && data.role && id !== currentUserId) {
            throw new Error('Não é possível alterar role de outros usuários');
        }
        if (data.email && data.email !== existingUser.email) {
            const emailExists = await prismaClient_1.prismaClient.user.findUnique({
                where: { email: data.email },
            });
            if (emailExists) {
                throw new Error('Email já está em uso');
            }
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.email)
            updateData.email = data.email;
        if (data.role && currentUserRole === 'ADMIN')
            updateData.role = data.role;
        if (data.password) {
            const saltRounds = 10;
            updateData.password = await bcrypt_1.default.hash(data.password, saltRounds);
        }
        const user = await prismaClient_1.prismaClient.user.update({
            where: { id },
            data: updateData,
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
        return user;
    }
}
exports.UpdateUserService = UpdateUserService;
//# sourceMappingURL=UpdateUserService.js.map