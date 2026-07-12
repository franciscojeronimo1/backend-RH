import { prismaClient } from '../../config/prismaClient';

const PrismaModule = require('../../../generated/prisma/internal/prismaNamespace');
const { Decimal } = PrismaModule;

export interface CreateBookletData {
    clientId: string;
    description?: string;
    notes?: string;
    installmentCount: number;
    installmentAmount: number;
    firstDueDate: string;
}

function addMonthsKeepingDay(isoDate: string, monthsToAdd: number): Date {
    const parts = isoDate.split('-').map(Number)
    const y = parts[0]
    const m = parts[1]
    const d = parts[2]
    if (!y || !m || !d) {
        throw new Error('Data do primeiro vencimento inválida')
    }
    const base = new Date(Date.UTC(y, m - 1, d))
    const targetMonth = base.getUTCMonth() + monthsToAdd
    const target = new Date(Date.UTC(base.getUTCFullYear(), targetMonth, 1))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
    const day = Math.min(d, lastDay)
    return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day))
}

class CreateBookletService {
    async execute(organizationId: string, data: CreateBookletData) {
        const client = await prismaClient.client.findFirst({
            where: { id: data.clientId, organizationId },
            select: { id: true },
        });

        if (!client) {
            throw new Error('Cliente não encontrado');
        }

        const amount = new Decimal(data.installmentAmount);
        const totalAmount = amount.mul(data.installmentCount);

        const parcelsData = Array.from({ length: data.installmentCount }, (_, i) => ({
            number: i + 1,
            dueDate: addMonthsKeepingDay(data.firstDueDate, i),
            amount,
            status: 'PENDING' as const,
        }));

        const booklet = await prismaClient.booklet.create({
            data: {
                organizationId,
                clientId: data.clientId,
                description: data.description ?? null,
                notes: data.notes ?? null,
                installmentCount: data.installmentCount,
                installmentAmount: amount,
                totalAmount,
                firstDueDate: new Date(`${data.firstDueDate}T00:00:00.000Z`),
                parcels: {
                    create: parcelsData,
                },
            },
            include: {
                client: true,
                parcels: {
                    orderBy: { number: 'asc' },
                },
            },
        });

        return booklet;
    }
}

export { CreateBookletService };
