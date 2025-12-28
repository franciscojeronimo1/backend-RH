import { Router } from 'express';
import { CreateUserController } from './controllers/user/CreateUserController';
import { CreateStaffController } from './controllers/user/CreateStaffController';
import { ListUsersController } from './controllers/user/ListUsersController';
import { GetUserByIdController } from './controllers/user/GetUserByIdController';
import { UpdateUserController } from './controllers/user/UpdateUserController';
import { DeleteUserController } from './controllers/user/DeleteUserController';
import { LoginController } from './controllers/auth/LoginController';
import { StartTimeRecordController } from './controllers/timeRecord/StartTimeRecordController';
import { StopTimeRecordController } from './controllers/timeRecord/StopTimeRecordController';
import { ListTimeRecordsController } from './controllers/timeRecord/ListTimeRecordsController';
import { GetSummaryController } from './controllers/timeRecord/GetSummaryController';
import { validateSchema } from './middlewares/validateSchema';
import { asyncHandler } from './middlewares/asyncHandler';
import { authMiddleware } from './middlewares/authMiddleware';
import { roleMiddleware } from './middlewares/roleMiddleware';
import { loginLimiter, createUserLimiter } from './middlewares/rateLimiter';
import { createUserSchema, createStaffSchema, updateUserSchema } from './schemas/userSchema';
import { loginSchema } from './schemas/authSchema';

const router = Router();

// Rotas públicas com rate limiting específico
router.post("/auth/login", loginLimiter, validateSchema(loginSchema), asyncHandler(new LoginController().handle));
// Rota pública: cria ADMIN (apenas para criar o primeiro administrador)
router.post("/users", createUserLimiter, validateSchema(createUserSchema), asyncHandler(new CreateUserController().handle));

// Rotas protegidas - Usuários
// Apenas ADMIN pode criar STAFF
router.post("/users/staff", authMiddleware, roleMiddleware(['ADMIN']), validateSchema(createStaffSchema), asyncHandler(new CreateStaffController().handle));
router.get("/users", authMiddleware, asyncHandler(new ListUsersController().handle));
router.get("/users/:id", authMiddleware, asyncHandler(new GetUserByIdController().handle));
router.put("/users/:id", authMiddleware, validateSchema(updateUserSchema), asyncHandler(new UpdateUserController().handle));
router.delete("/users/:id", authMiddleware, roleMiddleware(['ADMIN']), asyncHandler(new DeleteUserController().handle));

// Rotas protegidas - Sistema de Ponto (ADMIN e STAFF podem usar)
router.post("/time-records/start", authMiddleware, asyncHandler(new StartTimeRecordController().handle));
router.post("/time-records/stop", authMiddleware, asyncHandler(new StopTimeRecordController().handle));
router.get("/time-records", authMiddleware, asyncHandler(new ListTimeRecordsController().handle));
router.get("/time-records/summary", authMiddleware, asyncHandler(new GetSummaryController().handle));

export {router};