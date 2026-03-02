import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET;
if (!secret) {
    throw new Error('STRIPE_SECRET não está definida no .env');
}

export const stripe = new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
});

