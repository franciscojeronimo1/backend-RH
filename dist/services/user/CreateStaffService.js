"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStaffService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prismaClient_1 = require("../../config/prismaClient");
const generateToken_1 = require("../../utils/generateToken");
const enums_1 = require("../../../generated/prisma/enums");
class CreateStaffService {
    async execute(adminId, name, email, password) {
        const admin = await prismaClient_1.prismaClient.user.findUnique({
            where: { id: adminId }
        });
        if (!admin) {
            throw new Error('Administrador não encontrado');
        }
        if (admin.role !== enums_1.Role.ADMIN) {
            throw new Error('Apenas administradores podem criar usuários STAFF');
        }
        if (!admin.organizationId) {
            throw new Error('Administrador não está vinculado a uma organização');
        }
        const existingUser = await prismaClient_1.prismaClient.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            throw new Error('Email já está em uso');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const staff = await prismaClient_1.prismaClient.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: enums_1.Role.STAFF,
                createdById: adminId,
                organizationId: admin.organizationId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        const token = (0, generateToken_1.generateToken)({
            id: staff.id,
            email: staff.email,
            role: staff.role,
        });
        return {
            user: staff,
            token,
        };
    }
}
exports.CreateStaffService = CreateStaffService;
//# sourceMappingURL=CreateStaffService.js.map