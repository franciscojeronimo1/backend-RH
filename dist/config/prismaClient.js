"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.prismaClient = void 0;
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const PrismaClientModule = require("../../generated/prisma/client");
const PrismaClient = PrismaClientModule.PrismaClient;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL não está definida nas variáveis de ambiente. " +
        "Configure a variável DATABASE_URL no arquivo .env");
}
const pool = new pg_1.Pool({
    connectionString,
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pool = pool;
pool.on('error', (err) => {
    console.error('Erro inesperado no pool de conexões do PostgreSQL:', err);
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const logConfig = process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];
const prismaClient = new PrismaClient({
    adapter,
    log: logConfig,
});
exports.prismaClient = prismaClient;
const gracefulShutdown = async () => {
    console.log('Desconectando do banco de dados...');
    await prismaClient.$disconnect();
    await pool.end();
    console.log('Conexões fechadas com sucesso');
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled Rejection:', reason);
    await gracefulShutdown();
    process.exit(1);
});
//# sourceMappingURL=prismaClient.js.map