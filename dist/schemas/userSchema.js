"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createStaffSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3, { message: "O nome precisa ter no mínimo 3 caracteres" }),
        email: zod_1.z.email({ message: "O email precisa ser válido" }),
        password: zod_1.z.string().min(6, { message: "A senha precisa ter no mínimo 6 caracteres" }),
        organizationName: zod_1.z.string().min(2, { message: "O nome da empresa precisa ter no mínimo 2 caracteres" }).optional(),
    }),
});
exports.createStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3, { message: "O nome precisa ter no mínimo 3 caracteres" }),
        email: zod_1.z.email({ message: "O email precisa ser válido" }),
        password: zod_1.z.string().min(6, { message: "A senha precisa ter no mínimo 6 caracteres" }),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(3, { message: "O nome precisa ter no mínimo 3 caracteres" }).optional(),
        email: zod_1.z.email({ message: "O email precisa ser válido" }).optional(),
        password: zod_1.z.string().min(6, { message: "A senha precisa ter no mínimo 6 caracteres" }).optional(),
        role: zod_1.z.enum(['STAFF', 'ADMIN'], { message: "O role deve ser STAFF ou ADMIN" }).optional(),
    }),
});
//# sourceMappingURL=userSchema.js.map