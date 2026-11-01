import Stripe from 'stripe';

let client = null;

// Permite inyectar un cliente falso en los tests.
export function setStripeClient(fake) {
  client = fake;
}

export function getStripe() {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Falta STRIPE_SECRET_KEY');
  client = new Stripe(key);
  return client;
}

export const PRICE_CENTS = Number(process.env.PRICE_EUR_CENTS || 4900);
export const MAX_GENERATIONS = Number(process.env.MAX_GENERATIONS || 3);
