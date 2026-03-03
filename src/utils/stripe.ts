import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET;
if (!secret) {
    throw new Error('STRIPE_SECRET não está definida no .env');
}

export const stripe = new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
});


export const getStripeCustomerByEmail = async (email: string) => {
    const customer = await stripe.customers.list({
        email,
    });
    return customer.data[0];
};

export const createStripeCustomer = async (data: {
    email: string;
    name?: string;
}) => {
    const customer = await getStripeCustomerByEmail(data?.email);
    if (customer) return customer;

    return stripe.customers.create({
        email: data.email,
        name: data.name,
    });
}