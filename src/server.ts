import cors from 'cors';
import helmet from 'helmet';
import "dotenv/config";
import express from 'express';
import { router } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';

const app = express();

// Segurança: Helmet para headers de segurança
app.use(helmet());

// CORS configurado
app.use(cors());

// Rate limiting geral
app.use(generalLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));

// Rotas
app.use(router);

// Error handler (deve ser o último)
app.use(errorHandler);

    const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});