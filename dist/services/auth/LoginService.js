"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prismaClient_1 = require("../../config/prismaClient");
const generateToken_1 = require("../../utils/generateToken");
class LoginService {
    async execute(email, password) {
        const user = await prismaClient_1.prismaClient.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                organizationId: true,
            },
        });
        let passwordMatch = false;
        if (user) {
            passwordMatch = await bcrypt_1.default.compare(password, user.password);
        }
        else {
            await bcrypt_1.default.compare(password, '$2b$10$dummyhashheretopreventtimingattacks');
        }
        if (!user || !passwordMatch) {
            throw new Error('Email ou senha incorretos');
        }
        const organization = user.organizationId ? await prismaClient_1.prismaClient.organization.findUnique({
            where: { id: user.organizationId },
            select: {
                id: true,
                name: true,
            },
        }) : null;
        const token = (0, generateToken_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            },
            organization: organization ? {
                id: organization.id,
                name: organization.name,
            } : null,
            token,
        };
    }
}
exports.LoginService = LoginService;
//# sourceMappingURL=LoginService.js.map