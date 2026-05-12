import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new StripeConfigError(
      "Missing STRIPE_SECRET_KEY. Add it to .env.local (test key starts with sk_test_).",
    );
  }
  // Uses the SDK's bundled default API version. Pin explicitly later if
  // we want lockstep across deploys (apiVersion option on Stripe constructor).
  cached = new Stripe(key, { typescript: true });
  return cached;
}

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}
