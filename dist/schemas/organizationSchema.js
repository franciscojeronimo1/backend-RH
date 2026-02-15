"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrganizationSchema = void 0;
const zod_1 = require("zod");
exports.updateOrganizationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, { message: "O nome da organização é obrigatório" }).optional(),
        cnpj: zod_1.z.string().optional().nullable(),
        email: zod_1.z.string().email({ message: "Email inválido" }).optional().nullable(),
        phone: zod_1.z.string().optional().nullable(),
        address: zod_1.z.string().optional().nullable(),
    }),
});
//# sourceMappingURL=organizationSchema.js.map