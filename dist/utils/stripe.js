"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeCustomer = exports.getStripeCustomerByEmail = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const secret = process.env.STRIPE_SECRET;
if (!secret) {
    throw new Error('STRIPE_SECRET não está definida no .env');
}
exports.stripe = new stripe_1.default(secret, {
    httpClient: stripe_1.default.createFetchHttpClient(),
});
const getStripeCustomerByEmail = async (email) => {
    const customer = await exports.stripe.customers.list({
        email,
    });
    return customer.data[0];
};
exports.getStripeCustomerByEmail = getStripeCustomerByEmail;
const createStripeCustomer = async (data) => {
    const customer = await (0, exports.getStripeCustomerByEmail)(data?.email);
    if (customer)
        return customer;
    return exports.stripe.customers.create({
        email: data.email,
        name: data.name,
    });
};
exports.createStripeCustomer = createStripeCustomer;
//# sourceMappingURL=stripe.js.map