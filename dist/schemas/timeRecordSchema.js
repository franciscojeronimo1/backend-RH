"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTimeRecordsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listTimeRecordsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        userId: zod_1.z.string().uuid().optional(),
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data deve estar no formato YYYY-MM-DD" }).optional(),
        periodDays: zod_1.z.coerce.number().int().min(1).max(366).optional(),
        month: zod_1.z.string().regex(/^\d{4}-\d{2}$/, { message: "Mês deve estar no formato YYYY-MM" }).optional(),
    }),
});
//# sourceMappingURL=timeRecordSchema.js.map