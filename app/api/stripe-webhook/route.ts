import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var`);
  return value;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing stripe-signature header", { status: 400 });

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      requireEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch {
    return new NextResponse("Webhook Error", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {

    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.user_id;

    if (userId) {
      await supabase
        .from("users")
        .update({ is_pro: true })
        .eq("id", userId);
    }

  }

  return NextResponse.json({ received: true });
}