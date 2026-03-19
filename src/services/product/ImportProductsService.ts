import { prismaClient } from '../../config/prismaClient';
import * as XLSX from 'xlsx';
// @ts-ignore - Import do Decimal do Prisma gerado
const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

export type ImportColumnMapping = {
    name: string;        
    code?: string;
    sku?: string;
    category?: string;
    quantity: string;       
    unitPrice: string;    
    minStock?: string;
    unit?: string;
    costPrice?: string;
    salePrice?: string;
    supplierName?: string;
    supplierDoc?: string;
    invoiceNumber?: string;
    notes?: string;
};

type MappedRow = {
    name: string;
    code?: string;
    sku?: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    minStock?: number;
    unit?: string;
    costPrice?: number;
    salePrice?: number;
    supplierName?: string;
    supplierDoc?: string;
    invoiceNumber?: string;
    notes?: string;
};

type ImportSuccess = {
    line: number;
    productId: string;
    name: string;
    quantity: number;
};

type ImportError = {
    line: number;
    field?: string;
    message: string;
};

type ImportResult = {
    summary: {
        total: number;
        success: number;
        errors: number;
    };
    success: ImportSuccess[];
    errors: ImportError[];
};

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && !isNaN(value)) return value;
    const str = String(value).trim().replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

function parseInteger(value: unknown): number | null {
    const num = parseNumber(value);
    if (num === null) return null;
    const int = Math.floor(num);
    return int >= 0 ? int : null;
}

function getCellValue(row: Record<string, unknown>, columnName: string): unknown {
    if (!columnName) return undefined;
    const keys = Object.keys(row);
    const match = keys.find(k => k.trim().toLowerCase() === columnName.trim().toLowerCase());
    return match !== undefined ? row[match] : row[columnName];
}

function mapRow(row: Record<string, unknown>, mapping: ImportColumnMapping, lineNumber: number): { data: MappedRow } | { error: ImportError } {
    const name = getCellValue(row, mapping.name);
    const nameStr = name !== undefined && name !== null && String(name).trim() !== '' ? String(name).trim() : null;

    if (!nameStr) {
        return { error: { line: lineNumber, field: 'name', message: 'Nome é obrigatório' } };
    }

    const quantity = parseInteger(getCellValue(row, mapping.quantity));
    if (quantity === null || quantity < 0) {
        return { error: { line: lineNumber, field: 'quantity', message: 'Quantidade deve ser um número inteiro maior ou igual a 0' } };
    }

    const unitPrice = parseNumber(getCellValue(row, mapping.unitPrice));
    if (unitPrice === null || unitPrice < 0) {
        return { error: { line: lineNumber, field: 'unitPrice', message: 'Preço unitário deve ser um número maior ou igual a 0' } };
    }

    // Se quantidade > 0, preço deve ser > 0 para evitar custo médio inválido
    if (quantity > 0 && unitPrice <= 0) {
        return { error: { line: lineNumber, field: 'unitPrice', message: 'Preço unitário deve ser maior que 0 quando há quantidade' } };
    }

    const codeVal = getCellValue(row, mapping.code ?? '');
    const code = codeVal !== undefined && codeVal !== null && String(codeVal).trim() !== '' ? String(codeVal).trim() : undefined;

    const skuVal = getCellValue(row, mapping.sku ?? '');
    const sku = skuVal !== undefined && skuVal !== null && String(skuVal).trim() !== '' ? String(skuVal).trim() : undefined;

    const categoryVal = getCellValue(row, mapping.category ?? '');
    const category = categoryVal !== undefined && categoryVal !== null && String(categoryVal).trim() !== '' ? String(categoryVal).trim() : undefined;

    const minStockVal = parseInteger(getCellValue(row, mapping.minStock ?? ''));
    const minStock = minStockVal !== null && minStockVal >= 0 ? minStockVal : 0;

    const unitVal = getCellValue(row, mapping.unit ?? '');
    const unit = unitVal !== undefined && unitVal !== null && String(unitVal).trim() !== '' ? String(unitVal).trim() : 'UN';

    const costPriceVal = parseNumber(getCellValue(row, mapping.costPrice ?? ''));
    const costPrice = costPriceVal !== null && costPriceVal >= 0 ? costPriceVal : undefined;

    const salePriceVal = parseNumber(getCellValue(row, mapping.salePrice ?? ''));
    const salePrice = salePriceVal !== null && salePriceVal >= 0 ? salePriceVal : undefined;

    const supplierNameVal = getCellValue(row, mapping.supplierName ?? '');
    const supplierName = supplierNameVal !== undefined && supplierNameVal !== null && String(supplierNameVal).trim() !== '' ? String(supplierNameVal).trim() : undefined;

    const supplierDocVal = getCellValue(row, mapping.supplierDoc ?? '');
    const supplierDoc = supplierDocVal !== undefined && supplierDocVal !== null && String(supplierDocVal).trim() !== '' ? String(supplierDocVal).trim() : undefined;

    const invoiceNumberVal = getCellValue(row, mapping.invoiceNumber ?? '');
    const invoiceNumber = invoiceNumberVal !== undefined && invoiceNumberVal !== null && String(invoiceNumberVal).trim() !== '' ? String(invoiceNumberVal).trim() : undefined;

    const notesVal = getCellValue(row, mapping.notes ?? '');
    const notes = notesVal !== undefined && notesVal !== null && String(notesVal).trim() !== '' ? String(notesVal).trim() : undefined;

    return {
        data: {
            name: nameStr,
            code,
            sku,
            category,
            quantity,
            unitPrice,
            minStock,
            unit,
            costPrice,
            salePrice,
            supplierName,
            supplierDoc,
            invoiceNumber,
            notes,
        },
    };
}

class ImportProductsService {
    async execute(
        organizationId: string,
        userId: string,
        fileBuffer: Buffer,
        mapping: ImportColumnMapping
    ): Promise<ImportResult> {
        const success: ImportSuccess[] = [];
        const errors: ImportError[] = [];

        const workbook = XLSX.read(fileBuffer, { type: 'buffer', raw: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return {
                summary: { total: 0, success: 0, errors: 0 },
                success: [],
                errors: [{ line: 0, message: 'Arquivo sem planilhas' }],
            };
        }

        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            return {
                summary: { total: 0, success: 0, errors: 0 },
                success: [],
                errors: [{ line: 0, message: 'Planilha inválida' }],
            };
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (rows.length === 0) {
            return {
                summary: { total: 0, success: 0, errors: 0 },
                success: [],
                errors: [{ line: 0, message: 'Arquivo sem dados (apenas cabeçalho ou vazio)' }],
            };
        }

        const codesSeenInFile = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
            const lineNumber = i + 2;
            const row = rows[i];
            if (!row) continue;
            const result = mapRow(row, mapping, lineNumber);

            if ('error' in result) {
                errors.push(result.error);
                continue;
            }

            const { data } = result;

            if (data.code) {
                if (codesSeenInFile.has(data.code)) {
                    errors.push({ line: lineNumber, field: 'code', message: `Código "${data.code}" duplicado na planilha` });
                    continue;
                }
                codesSeenInFile.add(data.code);
            }

            try {
                const existingByCode = data.code
                    ? await prismaClient.product.findFirst({
                          where: { organizationId, code: data.code },
                      })
                    : null;

                if (existingByCode) {
                    errors.push({ line: lineNumber, field: 'code', message: `Código "${data.code}" já existe no sistema` });
                    continue;
                }

                await prismaClient.$transaction(async (tx) => {
                    const product = await tx.product.create({
                        data: {
                            organizationId,
                            name: data.name,
                            code: data.code,
                            sku: data.sku,
                            category: data.category,
                            minStock: data.minStock ?? 0,
                            unit: data.unit ?? 'UN',
                            costPrice: data.costPrice != null ? new Decimal(data.costPrice) : null,
                            averageCost: data.quantity > 0 ? new Decimal(data.unitPrice) : (data.costPrice != null ? new Decimal(data.costPrice) : null),
                            salePrice: data.salePrice != null ? new Decimal(data.salePrice) : null,
                            currentStock: data.quantity,
                            active: true,
                            supplierName: data.supplierName ?? null,
                            supplierDoc: data.supplierDoc ?? null,
                        },
                    });

                    if (data.quantity > 0) {
                        const totalPrice = data.quantity * data.unitPrice;
                        await tx.stockEntry.create({
                            data: {
                                organizationId,
                                productId: product.id,
                                userId,
                                quantity: data.quantity,
                                unitPrice: new Decimal(data.unitPrice),
                                totalPrice: new Decimal(totalPrice),
                                supplierName: data.supplierName,
                                supplierDoc: data.supplierDoc,
                                invoiceNumber: data.invoiceNumber,
                                notes: data.notes,
                            },
                        });
                    }

                    success.push({
                        line: lineNumber,
                        productId: product.id,
                        name: product.name,
                        quantity: data.quantity,
                    });
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro ao processar linha';
                errors.push({ line: lineNumber, message: msg });
            }
        }

        return {
            summary: {
                total: rows.length,
                success: success.length,
                errors: errors.length,
            },
            success,
            errors,
        };
    }
}

export { ImportProductsService };
