"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const errorHandler_1 = require("./middlewares/errorHandler");
const authMiddleware_1 = require("./middlewares/authMiddleware");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(authMiddleware_1.optionalAuthMiddleware);
app.use(rateLimiter_1.generalLimiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(routes_1.router);
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 3333;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
server.timeout = 60000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
//# sourceMappingURL=server.js.map