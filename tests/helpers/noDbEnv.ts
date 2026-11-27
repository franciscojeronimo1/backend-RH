// Alguns serviços importam o Prisma; os testes unitários não tocam no banco (URL falsa, nenhuma consulta é feita).
process.env.DATABASE_URL ??= 'postgresql://teste@127.0.0.1:1/sem-banco';
