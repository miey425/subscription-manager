import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();

  console.log("Stripe webhook received:", body);

  return new Response("ok", { status: 200 });
}