import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createStripeClient,
  hasActiveProSubscription,
  requireEnv,
} from "@/lib/billing";

export const runtime = "nodejs";

async function findUserIdForSubscription(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const metadataUserId = subscription.metadata?.user_id;
  if (metadataUserId) {
    return metadataUserId;
  }

  if (typeof subscription.customer !== "string") {
    return null;
  }

  const customer = await stripe.customers.retrieve(subscription.customer);
  if ("deleted" in customer || !customer.email) {
    return null;
  }

  const { data: userRow, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", customer.email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return userRow?.id ?? null;
}

export async function POST(req: NextRequest) {
  const stripe = createStripeClient();
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

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

    if (!userId) {
      console.warn("Missing user_id in session.metadata", {
        sessionId: session.id,
        metadata: session.metadata,
      });
      return NextResponse.json({ received: true });
    }

    const { error } = await supabase
      .from("users")
      .upsert({ id: userId, is_pro: true }, { onConflict: "id" });

    if (error) {
      console.error("Failed to upsert users.is_pro", { userId, error });
      return new NextResponse("Failed to update user", { status: 500 });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;

    try {
      const userId = await findUserIdForSubscription(
        supabase,
        stripe,
        subscription
      );

      if (!userId) {
        console.warn("Missing user mapping for subscription event", {
          eventType: event.type,
          subscriptionId: subscription.id,
          customer: subscription.customer,
        });
        return NextResponse.json({ received: true });
      }

      const isPro =
        typeof subscription.customer === "string"
          ? await hasActiveProSubscription(stripe, subscription.customer)
          : false;

      const { error } = await supabase
        .from("users")
        .upsert({ id: userId, is_pro: isPro }, { onConflict: "id" });

      if (error) {
        console.error("Failed to sync users.is_pro from subscription event", {
          userId,
          subscriptionId: subscription.id,
          error,
        });
        return new NextResponse("Failed to sync user", { status: 500 });
      }
    } catch (error) {
      console.error("Failed to process subscription webhook", {
        eventType: event.type,
        error,
      });
      return new NextResponse("Failed to process webhook", { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
