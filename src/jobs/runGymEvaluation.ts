/**
 * Executa manualmente a rotina de alunos para todas as academias com o módulo ligado.
 * Uso: npm run gym:evaluate
 */
import 'dotenv/config';
import { GymEvaluationService } from '../services/gym/GymEvaluationService';
import { prismaClient, pool } from '../config/prismaClient';

async function main() {
    const results = await new GymEvaluationService().evaluateAll();
    console.table(results);
    await prismaClient.$disconnect();
    await pool.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
