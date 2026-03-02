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
import { GetSubscriptionController } from './controllers/subscription/GetSubscriptionController';
import { validateSchema } from './middlewares/validateSchema';
import { asyncHandler } from './middlewares/asyncHandler';
import { authMiddleware } from './middlewares/authMiddleware';
import { tenantMiddleware } from './middlewares/tenantMiddleware';
import { roleMiddleware } from './middlewares/roleMiddleware';
import { premiumMiddleware } from './middlewares/premiumMiddleware';
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

// ========== Rotas FREE (conta + área de pagamento) ==========
// Usuários - conta
router.get("/users", authMiddleware, asyncHandler(new ListUsersController().handle));
router.get("/users/:id", authMiddleware, asyncHandler(new GetUserByIdController().handle));
router.put("/users/:id", authMiddleware, validateSchema(updateUserSchema), asyncHandler(new UpdateUserController().handle));

// Organização - conta
router.get("/organizations", authMiddleware, tenantMiddleware, asyncHandler(new GetOrganizationController().handle));
router.put("/organizations", authMiddleware, tenantMiddleware, validateSchema(updateOrganizationSchema), asyncHandler(new UpdateOrganizationController().handle));

// Assinatura - área de pagamento (FREE acessa para ver plano e fazer upgrade)
router.get("/subscription", authMiddleware, tenantMiddleware, asyncHandler(new GetSubscriptionController().handle));

// Rotas públicas de criação
router.post("/organizations", authMiddleware, validateSchema(createOrganizationSchema), asyncHandler(new CreateOrganizationController().handle));

// ========== Rotas PREMIUM (exigem plano premium) ==========
// Usuários - criar staff e deletar (PREMIUM)
router.post("/users/staff", authMiddleware, tenantMiddleware, premiumMiddleware, roleMiddleware(['ADMIN']), validateSchema(createStaffSchema), asyncHandler(new CreateStaffController().handle));
router.delete("/users/:id", authMiddleware, tenantMiddleware, premiumMiddleware, roleMiddleware(['ADMIN']), asyncHandler(new DeleteUserController().handle));

// Sistema de Ponto (PREMIUM)
router.post("/time-records/start", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new StartTimeRecordController().handle));
router.post("/time-records/stop", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new StopTimeRecordController().handle));
router.get("/time-records", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new ListTimeRecordsController().handle));
router.get("/time-records/summary", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new GetSummaryController().handle));

// Categorias (PREMIUM)
router.get("/categories", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new ListCategoriesController().handle));
router.post("/categories", authMiddleware, tenantMiddleware, premiumMiddleware, validateSchema(createCategorySchema), asyncHandler(new CreateCategoryController().handle));
router.put("/categories/:id", authMiddleware, tenantMiddleware, premiumMiddleware, validateSchema(updateCategorySchema), asyncHandler(new UpdateCategoryController().handle));
router.delete("/categories/:id", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new DeleteCategoryController().handle));

// Produtos (PREMIUM)
router.post("/products", authMiddleware, tenantMiddleware, premiumMiddleware, validateSchema(createProductSchema), asyncHandler(new CreateProductController().handle));
router.get("/products", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new ListProductsController().handle));
router.get("/products/:id", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new GetProductByIdController().handle));
router.put("/products/:id", authMiddleware, tenantMiddleware, premiumMiddleware, validateSchema(updateProductSchema), asyncHandler(new UpdateProductController().handle));
router.delete("/products/:id", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new DeleteProductController().handle));

// Estoque (PREMIUM)
router.post("/stock/entries", authMiddleware, tenantMiddleware, premiumMiddleware, validateSchema(createStockEntrySchema), asyncHandler(new CreateStockEntryController().handle));
router.get("/stock/entries", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new ListStockEntriesController().handle));
router.post("/stock/exits", authMiddleware, tenantMiddleware, premiumMiddleware, validateSchema(createStockExitSchema), asyncHandler(new CreateStockExitController().handle));
router.get("/stock/exits", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(new ListStockExitsController().handle));

// Relatórios de Estoque (PREMIUM)
const stockReportController = new StockReportController();
router.get("/stock/current", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(stockReportController.getCurrentStock.bind(stockReportController)));
router.get("/stock/low-stock", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(stockReportController.getLowStock.bind(stockReportController)));
router.get("/stock/daily-usage", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(stockReportController.getDailyUsage.bind(stockReportController)));
router.get("/stock/weekly-usage", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(stockReportController.getWeeklyUsage.bind(stockReportController)));
router.get("/stock/total-value", authMiddleware, tenantMiddleware, premiumMiddleware, asyncHandler(stockReportController.getTotalValue.bind(stockReportController)));

export {router};