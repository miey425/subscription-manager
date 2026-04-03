import { headers } from "next/headers";
import { createStripeClient } from "@/lib/billing";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

const stripe = createStripeClient();

export async function POST(req: Request) {
  if (!priceId) {
    return Response.json(
      { error: "Missing STRIPE_PRICE_ID env var (expected a 'price_' id)" },
      { status: 500 }
    );
  }

  if (priceId.startsWith("prod_")) {
    return Response.json(
      {
        error:
          "STRIPE_PRICE_ID is a product id ('prod_...'). Set a price id ('price_...') for Checkout line_items.price.",
      },
      { status: 500 }
    );
  }

  const h = await headers();
  const origin =
    h.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const body = await req.json().catch(() => null);
  const userId = body && typeof body.userId === "string" ? body.userId : null;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(userId
        ? {
            subscription_data: {
              metadata: {
                user_id: userId,
              },
            },
          }
        : {}),
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      ...(userId ? { metadata: { user_id: userId } } : {}),
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
