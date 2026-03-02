"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const prismaClient_1 = require("../../config/prismaClient");
class HealthController {
    async handle(_req, res) {
        try {
            await prismaClient_1.pool.query('SELECT 1');
            return res.status(200).json({ status: 'ok', database: 'connected' });
        }
        catch (error) {
            console.error('Health check failed:', error);
            return res.status(503).json({ status: 'unavailable', database: 'disconnected' });
        }
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=HealthController.js.map