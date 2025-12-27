import jwt from 'jsonwebtoken';

interface TokenPayload {
    id: string;
    email: string;
    role: string;
}

export const generateToken = (payload: TokenPayload): string => {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
        throw new Error('JWT_SECRET não está configurado. Configure a variável de ambiente JWT_SECRET.');
    }
    
    return jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
};

