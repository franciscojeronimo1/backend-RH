"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importProductsSchema = exports.importProductsMappingSchema = void 0;
const zod_1 = require("zod");
exports.importProductsMappingSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, { message: 'O mapeamento do campo "name" (nome) é obrigatório' }),
    quantity: zod_1.z.string().min(1, { message: 'O mapeamento do campo "quantity" (quantidade) é obrigatório' }),
    unitPrice: zod_1.z.string().min(1, { message: 'O mapeamento do campo "unitPrice" (preço unitário) é obrigatório' }),
    code: zod_1.z.string().optional(),
    sku: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    minStock: zod_1.z.string().optional(),
    unit: zod_1.z.string().optional(),
    costPrice: zod_1.z.string().optional(),
    salePrice: zod_1.z.string().optional(),
    supplierName: zod_1.z.string().optional(),
    supplierDoc: zod_1.z.string().optional(),
    invoiceNumber: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.importProductsSchema = zod_1.z.object({
    body: zod_1.z.object({
        file: zod_1.z.string().min(1, { message: 'O arquivo em base64 é obrigatório' }),
        mapping: zod_1.z.object({
            name: zod_1.z.string().min(1, { message: 'O mapeamento do campo "name" (nome) é obrigatório' }),
            quantity: zod_1.z.string().min(1, { message: 'O mapeamento do campo "quantity" (quantidade) é obrigatório' }),
            unitPrice: zod_1.z.string().min(1, { message: 'O mapeamento do campo "unitPrice" (preço unitário) é obrigatório' }),
            code: zod_1.z.string().optional(),
            sku: zod_1.z.string().optional(),
            category: zod_1.z.string().optional(),
            minStock: zod_1.z.string().optional(),
            unit: zod_1.z.string().optional(),
            costPrice: zod_1.z.string().optional(),
            salePrice: zod_1.z.string().optional(),
            supplierName: zod_1.z.string().optional(),
            supplierDoc: zod_1.z.string().optional(),
            invoiceNumber: zod_1.z.string().optional(),
            notes: zod_1.z.string().optional(),
        }),
    }),
});
//# sourceMappingURL=importProductsSchema.js.map