import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createStripeClient,
  findCustomerByEmail,
  requireEnv,
} from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization Bearer token" },
      { status: 401 }
    );
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(
    token
  );

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: userError?.message ?? "Invalid token" },
      { status: 401 }
    );
  }

  const email = userData.user.email;
  if (!email) {
    return NextResponse.json(
      { error: "User email is required for billing portal" },
      { status: 400 }
    );
  }

  const stripe = createStripeClient();
  const customer = await findCustomerByEmail(stripe, email);

  if (!customer) {
    return NextResponse.json(
      { error: "No Stripe customer found for this account" },
      { status: 404 }
    );
  }

  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: origin,
  });

  return NextResponse.json({ url: portalSession.url });
}
