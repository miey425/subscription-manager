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
  const { sessionId } = (await req.json().catch(() => ({}))) as {
    sessionId?: unknown;
  };

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== "subscription") {
      return NextResponse.json({ error: "Unexpected session mode" }, { status: 400 });
    }

    // For Checkout, 'complete' indicates the checkout flow finished.
    // Payment status may still be 'unpaid' for some async flows, but for subscriptions
    // in typical card flows it should be paid.
    if (session.status !== "complete") {
      return NextResponse.json(
        { error: "Checkout not complete yet", status: session.status },
        { status: 409 }
      );
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id in metadata" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users")
      .upsert({ id: userId, is_pro: true }, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

