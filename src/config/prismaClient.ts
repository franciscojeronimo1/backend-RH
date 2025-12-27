// @ts-ignore - Import do Prisma Client com output customizado
import type { PrismaClient as PrismaClientType } from "../../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const PrismaClientModule = require("../../generated/prisma/client");
const PrismaClient = PrismaClientModule.PrismaClient;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL não está definida nas variáveis de ambiente. " +
    "Configure a variável DATABASE_URL no arquivo .env"
  );
}

const pool = new Pool({
  connectionString,
  // Limites de conexão para evitar sobrecarga
  max: 20, // máximo de 20 conexões no pool
  min: 5,  // mínimo de 5 conexões mantidas
  idleTimeoutMillis: 30000, // fecha conexões idle após 30s
  connectionTimeoutMillis: 2000, // timeout de 2s para estabelecer conexão
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões do PostgreSQL:', err);
});

// Criar adapter do Prisma para PostgreSQL
const adapter = new PrismaPg(pool);

const logConfig = process.env.NODE_ENV === "development" 
  ? ["query", "error", "warn"] 
  : ["error"];


// O Prisma com output customizado e engine type "client" requer um adapter
const prismaClient: PrismaClientType = new PrismaClient({
  adapter,
  log: logConfig,
});

// Graceful shutdown: desconectar do banco quando o processo terminar
const gracefulShutdown = async () => {
  console.log('Desconectando do banco de dados...');
  await prismaClient.$disconnect();
  await pool.end();
  console.log('Conexões fechadas com sucesso');
};

// Capturar sinais de encerramento do processo
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Tratamento de erros não capturados
process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  await gracefulShutdown();
  process.exit(1);
});

export { prismaClient, pool };
