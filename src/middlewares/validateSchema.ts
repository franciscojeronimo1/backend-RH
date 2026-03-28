import { ZodError, ZodType} from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateSchema = (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = (await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        })) as Record<string, unknown>;

        if ('body' in parsed && parsed.body !== undefined) {
            req.body = parsed.body as Request['body'];
        }
        if ('query' in parsed && parsed.query !== undefined) {
            req.query = parsed.query as Request['query'];
        }
        if (
            'params' in parsed &&
            parsed.params !== undefined &&
            typeof parsed.params === 'object' &&
            parsed.params !== null
        ) {
            Object.assign(req.params, parsed.params as Request['params']);
        }

        return next();
    } catch (error) {
        if(error instanceof ZodError) {
            return res.status(400).json({
                error: "Erro validaçao",
                details: error.issues.map((issue)  => ({
                    campo: issue.path.slice(1).join("."),
                    mensagem: issue.message,
                })),
            });
        }
        return res.status(500).json({
            error: "Erro interno do servidor",
        });
    }
};