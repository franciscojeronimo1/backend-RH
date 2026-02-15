"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserLimiter = exports.loginLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições deste IP, tente novamente em alguns minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});
exports.createUserLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Muitas tentativas de criação de conta. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.js.map