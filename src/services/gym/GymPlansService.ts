import { prismaClient } from '../../config/prismaClient';
import { GymError } from './GymError';
import { rethrowUnique } from './gymPrismaErrors';

export interface PlanInput {
    name?: string;
    description?: string | null;
    price?: number;
    durationMonths?: number;
    durationDays?: number;
    active?: boolean;
}

const UNIQUE = { name: 'Já existe um plano com esse nome.' };

type PlanRow = { price: { toString(): string } } & Record<string, unknown>;
export const planToJson = <T extends PlanRow>(p: T) => ({ ...p, price: Number(p.price.toString()) });

class GymPlansService {
    async list(organizationId: string, onlyActive = false) {
        const plans = await prismaClient.membershipPlan.findMany({
            where: { organizationId, ...(onlyActive ? { active: true } : {}) },
            orderBy: [{ active: 'desc' }, { durationMonths: 'asc' }, { durationDays: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { memberships: true } } },
        });
        return { plans: plans.map(planToJson) };
    }

    async findOrFail(organizationId: string, id: string) {
        const plan = await prismaClient.membershipPlan.findFirst({ where: { id, organizationId } });
        if (!plan) throw new GymError('Plano não encontrado', 404);
        return plan;
    }

    async create(organizationId: string, data: Required<Omit<PlanInput, 'description'>> & { description?: string | null }) {
        try {
            const plan = await prismaClient.membershipPlan.create({
                data: {
                    organizationId,
                    name: data.name.trim(),
                    description: data.description ?? null,
                    price: data.price,
                    durationMonths: data.durationMonths,
                    durationDays: data.durationDays,
                    active: data.active,
                },
            });
            return planToJson(plan);
        } catch (error) {
            rethrowUnique(error, UNIQUE);
        }
    }

    async update(organizationId: string, id: string, data: PlanInput) {
        const current = await this.findOrFail(organizationId, id);
        const months = data.durationMonths ?? current.durationMonths;
        const days = data.durationDays ?? current.durationDays;
        if (months + days <= 0) throw new GymError('O plano precisa ter duração (meses ou dias)', 400);
        try {
            const plan = await prismaClient.membershipPlan.update({
                where: { id },
                data: {
                    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                    ...(data.description !== undefined ? { description: data.description } : {}),
                    ...(data.price !== undefined ? { price: data.price } : {}),
                    ...(data.durationMonths !== undefined ? { durationMonths: data.durationMonths } : {}),
                    ...(data.durationDays !== undefined ? { durationDays: data.durationDays } : {}),
                    ...(data.active !== undefined ? { active: data.active } : {}),
                },
            });
            return planToJson(plan);
        } catch (error) {
            rethrowUnique(error, UNIQUE);
        }
    }
}

export { GymPlansService };
