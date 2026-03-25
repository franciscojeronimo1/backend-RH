"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportProductsController = void 0;
const ImportProductsService_1 = require("../../services/product/ImportProductsService");
class ImportProductsController {
    async handle(req, res) {
        if (!req.user || !req.user.organizationId) {
            return res.status(401).json({ error: 'Usuário não autenticado ou sem organização' });
        }
        const { file, mapping: mappingRaw } = req.body;
        if (!file || typeof file !== 'string') {
            return res.status(400).json({
                error: 'Arquivo é obrigatório',
                details: 'Envie o arquivo em base64 no campo "file"',
            });
        }
        let buffer;
        try {
            buffer = Buffer.from(file, 'base64');
        }
        catch {
            return res.status(400).json({
                error: 'Arquivo inválido',
                details: 'O campo "file" deve conter uma string base64 válida',
            });
        }
        if (buffer.length === 0) {
            return res.status(400).json({
                error: 'Arquivo vazio',
                details: 'O arquivo em base64 está vazio',
            });
        }
        const mapping = {
            name: mappingRaw?.name,
            quantity: mappingRaw?.quantity,
            unitPrice: mappingRaw?.unitPrice,
            code: mappingRaw?.code,
            sku: mappingRaw?.sku,
            category: mappingRaw?.category,
            minStock: mappingRaw?.minStock,
            unit: mappingRaw?.unit,
            costPrice: mappingRaw?.costPrice,
            salePrice: mappingRaw?.salePrice,
            supplierName: mappingRaw?.supplierName,
            supplierDoc: mappingRaw?.supplierDoc,
            invoiceNumber: mappingRaw?.invoiceNumber,
            notes: mappingRaw?.notes,
        };
        if (!mapping.name || !mapping.quantity || !mapping.unitPrice) {
            return res.status(400).json({
                error: 'Mapeamento inválido',
                details: 'O campo "mapping" deve conter name, quantity e unitPrice (nomes das colunas no arquivo)',
            });
        }
        const importService = new ImportProductsService_1.ImportProductsService();
        const result = await importService.execute(req.user.organizationId, req.user.id, buffer, mapping);
        return res.status(200).json({
            message: 'Importação concluída',
            ...result,
        });
    }
}
exports.ImportProductsController = ImportProductsController;
//# sourceMappingURL=ImportProductsController.js.map