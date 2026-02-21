"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    console.error('Erro:', err);
    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.code === 'P2002') {
            return res.status(400).json({
                error: 'Erro de validação',
                message: 'Este email já está em uso',
            });
        }
        if (err.code === 'P2025') {
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
    if (err.name === 'ValidationError' || err.message.includes('validação')) {
        return res.status(400).json({
            error: 'Erro de validação',
            message: err.message,
        });
    }
    if (err.message.includes('Email ou senha') || err.message.includes('Token')) {
        return res.status(401).json({
            error: 'Erro de autenticação',
            message: err.message,
        });
    }
    if (err.message.includes('Acesso negado') || err.message.includes('Permissão')) {
        return res.status(403).json({
            error: 'Acesso negado',
            message: err.message,
        });
    }
    if (err.message.includes('já existe')) {
        return res.status(400).json({
            error: 'Erro de validação',
            message: err.message,
        });
    }
    if (err.message.includes('não encontrado')) {
        return res.status(404).json({
            error: 'Recurso não encontrado',
            message: err.message,
        });
    }
    return res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message || 'Ocorreu um erro inesperado',
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map