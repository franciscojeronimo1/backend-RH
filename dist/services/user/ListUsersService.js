"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListUsersService = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class ListUsersService {
    async execute(userRole, userId) {
        if (userRole === 'STAFF' && userId) {
            const users = await prismaClient_1.prismaClient.user.findMany({
                where: {
                    OR: [
                        { id: userId },
                        { createdById: userId },
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdById: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            return users;
        }
        const users = await prismaClient_1.prismaClient.user.findMany({
            where: userId
                ? {
                    OR: [
                        { id: userId },
                        { createdById: userId },
                    ],
                }
                : undefined,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return users;
    }
}
exports.ListUsersService = ListUsersService;
//# sourceMappingURL=ListUsersService.js.map