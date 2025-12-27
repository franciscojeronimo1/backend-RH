import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error('Erro:', err);

    // Erros do Prisma
    if (err.name === 'PrismaClientKnownRequestError') {
        // Erro de constraint única (email duplicado, etc)
        if ((err as any).code === 'P2002') {
            return res.status(400).json({
                error: 'Erro de validação',
                message: 'Este email já está em uso',
            });
        }
        
        // Usuário não encontrado
        if ((err as any).code === 'P2025') {
            return res.status(404).json({
                error: 'Recurso não encontrado',
                message: err.message,
            });
        }

        return res.status(400).json({
            error: 'Erro no banco de dados',
            message: err.message,
        });
    }

    // Erros de validação
    if (err.name === 'ValidationError' || err.message.includes('validação')) {
        return res.status(400).json({
            error: 'Erro de validação',
            message: err.message,
        });
    }

    // Erros de autenticação/autorização
    if (err.message.includes('Email ou senha') || err.message.includes('Token')) {
        return res.status(401).json({
            error: 'Erro de autenticação',
            message: err.message,
        });
    }

    // Erros de permissão
    if (err.message.includes('Acesso negado') || err.message.includes('Permissão')) {
        return res.status(403).json({
            error: 'Acesso negado',
            message: err.message,
        });
    }

    // Erros de recurso não encontrado
    if (err.message.includes('não encontrado')) {
        return res.status(404).json({
            error: 'Recurso não encontrado',
            message: err.message,
        });
    }

    // Erro genérico
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message || 'Ocorreu um erro inesperado',
    });
};
