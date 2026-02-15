"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetOrganizationService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class GetOrganizationService {
    async execute(organizationId) {
        const organization = await prismaClient_1.prismaClient.organization.findUnique({
            where: { id: organizationId },
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                    },
                },
            },
        });
        if (!organization) {
            throw new Error('Organização não encontrada');
        }
        return organization;
    }
}
exports.GetOrganizationService = GetOrganizationService;
//# sourceMappingURL=GetOrganizationService.js.map