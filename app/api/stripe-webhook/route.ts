import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();

  console.log("Stripe webhook received:", body);

  return NextResponse.json({ received: true });
}