import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { organizationId?: string };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const [scheme, token = ""] = parts;

    if (!scheme || !/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ error: "Token mal formatado" });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res
        .status(500)
        .json({ error: "Erro de configuração do servidor" });
    }

    const decoded = jwt.verify(token, jwtSecret as string) as unknown as TokenPayload;

    req.user = decoded;
    return next();
  } catch (error) {
    const isExpired = error instanceof Error && error.name === "TokenExpiredError";
    return res.status(401).json({
      error: "Token inválido ou expirado",
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
};


export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const parts = authHeader.split(" ");
    if (parts.length !== 2) return next();
    const [scheme, token = ""] = parts;
    if (!scheme || !/^Bearer$/i.test(scheme) || !token) return next();

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return next();

    const decoded = jwt.verify(token, jwtSecret as string) as unknown as TokenPayload;
    req.user = decoded;
    return next();
  } catch {
    return next();
  }
};
