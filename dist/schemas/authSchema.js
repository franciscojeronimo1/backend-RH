"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.email({ message: "O email precisa ser válido" }),
        password: zod_1.z.string().min(1, { message: "A senha é obrigatória" }),
    }),
});
//# sourceMappingURL=authSchema.js.map