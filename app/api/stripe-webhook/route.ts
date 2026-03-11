import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var`);
  return value;
}

const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");

const stripe = new Stripe(stripeSecretKey);

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setProByEmail(email: string, isPro: boolean) {
  await supabase.from("users").update({ is_pro: isPro }).eq("email", email);
}

async function getCustomerEmail(
  customer: Stripe.Customer | Stripe.DeletedCustomer | string | null
) {
  if (!customer) return null;
  if (typeof customer !== "string") {
    if ("deleted" in customer && customer.deleted) return null;
    return customer.email ?? null;
  }

  const c = await stripe.customers.retrieve(customer);
  if (c.deleted) return null;
  return c.email ?? null;
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email ?? session.customer_email ?? null;
        if (email) await setProByEmail(email, true);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const email = await getCustomerEmail(sub.customer ?? null);
        if (!email) break;

        const isActive = sub.status === "active" || sub.status === "trialing";
        await setProByEmail(email, isActive);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = await getCustomerEmail(invoice.customer ?? null);
        if (email) await setProByEmail(email, false);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}