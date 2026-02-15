"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOrganizationService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class UpdateOrganizationService {
    async execute(organizationId, data) {
        const organization = await prismaClient_1.prismaClient.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new Error('Organização não encontrada');
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.cnpj !== undefined)
            updateData.cnpj = data.cnpj;
        if (data.email !== undefined)
            updateData.email = data.email;
        if (data.phone !== undefined)
            updateData.phone = data.phone;
        if (data.address !== undefined)
            updateData.address = data.address;
        const updatedOrganization = await prismaClient_1.prismaClient.organization.update({
            where: { id: organizationId },
            data: updateData,
        });
        return updatedOrganization;
    }
}
exports.UpdateOrganizationService = UpdateOrganizationService;
//# sourceMappingURL=UpdateOrganizationService.js.map