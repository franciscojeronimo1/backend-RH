import { Router } from 'express';
import { CreateUserController } from './controllers/user/CreateUserController';
import { ListUsersController } from './controllers/user/ListUsersController';
import { GetUserByIdController } from './controllers/user/GetUserByIdController';
import { UpdateUserController } from './controllers/user/UpdateUserController';
import { DeleteUserController } from './controllers/user/DeleteUserController';
import { LoginController } from './controllers/auth/LoginController';
import { validateSchema } from './middlewares/validateSchema';
import { asyncHandler } from './middlewares/asyncHandler';
import { authMiddleware } from './middlewares/authMiddleware';
import { roleMiddleware } from './middlewares/roleMiddleware';
import { loginLimiter, createUserLimiter } from './middlewares/rateLimiter';
import { createUserSchema, updateUserSchema } from './schemas/userSchema';
import { loginSchema } from './schemas/authSchema';

const router = Router();

// Rotas públicas com rate limiting específico
router.post("/auth/login", loginLimiter, validateSchema(loginSchema), asyncHandler(new LoginController().handle));
router.post("/users", createUserLimiter, validateSchema(createUserSchema), asyncHandler(new CreateUserController().handle));

// Rotas protegidas (requerem autenticação)
router.get("/users", authMiddleware, asyncHandler(new ListUsersController().handle));
router.get("/users/:id", authMiddleware, asyncHandler(new GetUserByIdController().handle));
router.put("/users/:id", authMiddleware, validateSchema(updateUserSchema), asyncHandler(new UpdateUserController().handle));
router.delete("/users/:id", authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(new DeleteUserController().handle));

export {router};