"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganizationSchema = exports.createStockExitSchema = exports.createStockEntrySchema = void 0;
const zod_1 = require("zod");
exports.createStockEntrySchema = zod_1.z.object({
    body: zod_1.z.object({
        productId: zod_1.z.string().uuid({ message: "ID do produto inválido" }),
        quantity: zod_1.z.number().int().positive({ message: "Quantidade deve ser um número inteiro positivo" }),
        unitPrice: zod_1.z.number().positive({ message: "Preço unitário deve ser positivo" }),
        supplierName: zod_1.z.string().optional(),
        supplierDoc: zod_1.z.string().optional(),
        invoiceNumber: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.createStockExitSchema = zod_1.z.object({
    body: zod_1.z.object({
        productId: zod_1.z.string().uuid({ message: "ID do produto inválido" }),
        quantity: zod_1.z.number().int().positive({ message: "Quantidade deve ser um número inteiro positivo" }),
        unitPrice: zod_1.z.number().positive({ message: "Preço unitário de venda deve ser positivo" }).optional(),
        projectName: zod_1.z.string().optional(),
        clientName: zod_1.z.string().optional(),
        serviceType: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.createOrganizationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, { message: "O nome da organização é obrigatório" }),
        cnpj: zod_1.z.string().optional(),
        email: zod_1.z.string().email({ message: "Email inválido" }).optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=stockSchema.js.map