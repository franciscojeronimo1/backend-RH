"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutLimiter = exports.createUserLimiter = exports.loginLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: 'Muitas requisições. Aguarde alguns minutos e tente novamente.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const user = req.user;
        return user?.id ?? (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? 'unknown');
    },
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
exports.checkoutLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Muitas tentativas de checkout. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const user = req.user;
        return user?.id ?? (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? 'unknown');
    },
});
//# sourceMappingURL=rateLimiter.js.map