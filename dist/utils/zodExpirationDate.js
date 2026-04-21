"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodExpirationDateField = zodExpirationDateField;
const zod_1 = require("zod");
function normalizeExpirationInput(value, mode) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return mode === 'update' ? null : undefined;
    if (value === 0 || value === '0')
        return mode === 'update' ? null : undefined;
    if (typeof value === 'number' && !Number.isFinite(value)) {
        return mode === 'update' ? null : undefined;
    }
    return value;
}
function zodExpirationDateField(mode) {
    return zod_1.z.preprocess((value) => normalizeExpirationInput(value, mode), zod_1.z
        .union([zod_1.z.coerce.date(), zod_1.z.null()])
        .optional()
        .transform((date) => {
        if (date === null || date === undefined)
            return date;
        const ms = date.getTime();
        if (Number.isNaN(ms) || ms === 0) {
            return mode === 'update' ? null : undefined;
        }
        return date;
    }));
}
//# sourceMappingURL=zodExpirationDate.js.map