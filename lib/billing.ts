import Stripe from "stripe";

export const PRO_ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env var`);
  }
  return value;
}

export function createStripeClient() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"));
}

export async function findCustomerByEmail(stripe: Stripe, email: string) {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return customers.data[0] ?? null;
}

export async function hasActiveProSubscription(
  stripe: Stripe,
  customerId: string
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  return subscriptions.data.some((subscription) =>
    PRO_ACTIVE_STATUSES.has(subscription.status)
  );
}

export async function ensureBillingPortalConfiguration(stripe: Stripe) {
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    is_default: true,
    limit: 1,
  });

  const existing = configurations.data[0];
  if (existing) {
    return existing;
  }

  return stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your Subscription Manager plan",
    },
    default_return_url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    features: {
      customer_update: {
        allowed_updates: ["email"],
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
      },
      subscription_update: {
        enabled: false,
        default_allowed_updates: [],
        products: [],
        proration_behavior: "none",
      },
    },
  });
}
