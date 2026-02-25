"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET não está configurado. Configure a variável de ambiente JWT_SECRET.');
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
//# sourceMappingURL=generateToken.js.map