import { Request, Response, NextFunction } from 'express';
import { prismaClient } from '../config/prismaClient';

/**
 * Middleware para garantir que o usuário tenha uma organização
 * e adicionar organizationId ao request
 */
export const tenantMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Buscar usuário com organização
        const user = await prismaClient.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                organizationId: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (!user.organizationId) {
            return res.status(400).json({ 
                error: 'Usuário não está vinculado a uma organização. Crie ou entre em uma organização primeiro.' 
            });
        }

        // Adicionar organizationId ao request
        req.user.organizationId = user.organizationId;

        return next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar organização' });
    }
};


