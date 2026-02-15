"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrganizationService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class CreateOrganizationService {
    async execute(name, userId, cnpj, email, phone, address) {
        const organization = await prismaClient_1.prismaClient.organization.create({
            data: {
                name,
                cnpj,
                email,
                phone,
                address,
            },
        });
        await prismaClient_1.prismaClient.user.update({
            where: { id: userId },
            data: {
                organizationId: organization.id,
            },
        });
        return organization;
    }
}
exports.CreateOrganizationService = CreateOrganizationService;
//# sourceMappingURL=CreateOrganizationService.js.map