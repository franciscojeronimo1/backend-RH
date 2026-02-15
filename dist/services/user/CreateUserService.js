"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prismaClient_1 = require("../../config/prismaClient");
const generateToken_1 = require("../../utils/generateToken");
const enums_1 = require("../../../generated/prisma/enums");
class CreateUserService {
    async execute(name, email, password, organizationName) {
        const existingUser = await prismaClient_1.prismaClient.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            throw new Error('Email já está em uso');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const orgName = organizationName || `${name} - Empresa`;
        const organization = await prismaClient_1.prismaClient.organization.create({
            data: {
                name: orgName,
            },
        });
        const user = await prismaClient_1.prismaClient.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: enums_1.Role.ADMIN,
                organizationId: organization.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                organizationId: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        const token = (0, generateToken_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        return {
            user,
            organization: {
                id: organization.id,
                name: organization.name,
            },
            token,
        };
    }
}
exports.CreateUserService = CreateUserService;
//# sourceMappingURL=CreateUserService.js.map