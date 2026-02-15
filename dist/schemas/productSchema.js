"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, { message: "O nome do produto é obrigatório" }),
        code: zod_1.z.string().optional(),
        sku: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        minStock: zod_1.z.number().int().min(0, { message: "Estoque mínimo deve ser maior ou igual a 0" }).default(0),
        unit: zod_1.z.string().min(1, { message: "A unidade é obrigatória" }).default("UN"),
        costPrice: zod_1.z.number().positive({ message: "Preço de custo deve ser positivo" }).optional(),
    }),
});
exports.updateProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, { message: "O nome do produto é obrigatório" }).optional(),
        code: zod_1.z.string().optional(),
        sku: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        minStock: zod_1.z.number().int().min(0).optional(),
        unit: zod_1.z.string().min(1).optional(),
        costPrice: zod_1.z.number().positive().optional(),
        active: zod_1.z.boolean().optional(),
    }),
});
//# sourceMappingURL=productSchema.js.map