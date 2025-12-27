import { Request, Response, NextFunction } from 'express';

type Role = 'STAFF' | 'ADMIN';

export const roleMiddleware = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (!allowedRoles.includes(req.user.role as Role)) {
            return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
        }

        return next();
    };
};

