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
import { CreateOrganizationController } from './controllers/organization/CreateOrganizationController';
import { GetOrganizationController } from './controllers/organization/GetOrganizationController';
import { UpdateOrganizationController } from './controllers/organization/UpdateOrganizationController';
import { CreateProductController } from './controllers/product/CreateProductController';
import { ListProductsController } from './controllers/product/ListProductsController';
import { GetProductByIdController } from './controllers/product/GetProductByIdController';
import { UpdateProductController } from './controllers/product/UpdateProductController';
import { DeleteProductController } from './controllers/product/DeleteProductController';
import { ListCategoriesController } from './controllers/category/ListCategoriesController';
import { CreateCategoryController } from './controllers/category/CreateCategoryController';
import { UpdateCategoryController } from './controllers/category/UpdateCategoryController';
import { DeleteCategoryController } from './controllers/category/DeleteCategoryController';
import { CreateStockEntryController } from './controllers/stock/CreateStockEntryController';
import { CreateStockExitController } from './controllers/stock/CreateStockExitController';
import { ListStockEntriesController } from './controllers/stock/ListStockEntriesController';
import { ListStockExitsController } from './controllers/stock/ListStockExitsController';
import { StockReportController } from './controllers/stock/StockReportController';
import { HealthController } from './controllers/health/HealthController';
import { validateSchema } from './middlewares/validateSchema';
import { asyncHandler } from './middlewares/asyncHandler';
import { authMiddleware } from './middlewares/authMiddleware';
import { tenantMiddleware } from './middlewares/tenantMiddleware';
import { roleMiddleware } from './middlewares/roleMiddleware';
import { loginLimiter, createUserLimiter } from './middlewares/rateLimiter';
import { createUserSchema, createStaffSchema, updateUserSchema } from './schemas/userSchema';
import { loginSchema } from './schemas/authSchema';
import { createProductSchema, updateProductSchema } from './schemas/productSchema';
import { createCategorySchema, updateCategorySchema } from './schemas/categorySchema';
import { createStockEntrySchema, createStockExitSchema, createOrganizationSchema } from './schemas/stockSchema';
import { updateOrganizationSchema } from './schemas/organizationSchema';

const router = Router();

// Health check (sem auth, sem rate limit pesado) - front pode chamar no load do app para aquecer o banco
router.get("/health", asyncHandler(new HealthController().handle));

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

// Rotas protegidas - Organização
router.post("/organizations", authMiddleware, validateSchema(createOrganizationSchema), asyncHandler(new CreateOrganizationController().handle));
router.get("/organizations", authMiddleware, tenantMiddleware, asyncHandler(new GetOrganizationController().handle));
router.put("/organizations", authMiddleware, tenantMiddleware, validateSchema(updateOrganizationSchema), asyncHandler(new UpdateOrganizationController().handle));

// Rotas protegidas - Categorias (requerem organização)
router.get("/categories", authMiddleware, tenantMiddleware, asyncHandler(new ListCategoriesController().handle));
router.post("/categories", authMiddleware, tenantMiddleware, validateSchema(createCategorySchema), asyncHandler(new CreateCategoryController().handle));
router.put("/categories/:id", authMiddleware, tenantMiddleware, validateSchema(updateCategorySchema), asyncHandler(new UpdateCategoryController().handle));
router.delete("/categories/:id", authMiddleware, tenantMiddleware, asyncHandler(new DeleteCategoryController().handle));

// Rotas protegidas - Produtos (requerem organização)
router.post("/products", authMiddleware, tenantMiddleware, validateSchema(createProductSchema), asyncHandler(new CreateProductController().handle));
router.get("/products", authMiddleware, tenantMiddleware, asyncHandler(new ListProductsController().handle));
router.get("/products/:id", authMiddleware, tenantMiddleware, asyncHandler(new GetProductByIdController().handle));
router.put("/products/:id", authMiddleware, tenantMiddleware, validateSchema(updateProductSchema), asyncHandler(new UpdateProductController().handle));
router.delete("/products/:id", authMiddleware, tenantMiddleware, asyncHandler(new DeleteProductController().handle));

// Rotas protegidas - Estoque - Entradas
router.post("/stock/entries", authMiddleware, tenantMiddleware, validateSchema(createStockEntrySchema), asyncHandler(new CreateStockEntryController().handle));
router.get("/stock/entries", authMiddleware, tenantMiddleware, asyncHandler(new ListStockEntriesController().handle));

// Rotas protegidas - Estoque - Saídas
router.post("/stock/exits", authMiddleware, tenantMiddleware, validateSchema(createStockExitSchema), asyncHandler(new CreateStockExitController().handle));
router.get("/stock/exits", authMiddleware, tenantMiddleware, asyncHandler(new ListStockExitsController().handle));

// Rotas protegidas - Relatórios de Estoque
const stockReportController = new StockReportController();
router.get("/stock/current", authMiddleware, tenantMiddleware, asyncHandler(stockReportController.getCurrentStock.bind(stockReportController)));
router.get("/stock/low-stock", authMiddleware, tenantMiddleware, asyncHandler(stockReportController.getLowStock.bind(stockReportController)));
router.get("/stock/daily-usage", authMiddleware, tenantMiddleware, asyncHandler(stockReportController.getDailyUsage.bind(stockReportController)));
router.get("/stock/weekly-usage", authMiddleware, tenantMiddleware, asyncHandler(stockReportController.getWeeklyUsage.bind(stockReportController)));
router.get("/stock/total-value", authMiddleware, tenantMiddleware, asyncHandler(stockReportController.getTotalValue.bind(stockReportController)));

export {router};