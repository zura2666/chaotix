import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { rateLimit429 } from "@/lib/rate-limit";

const MIN_DEPOSIT = 5;
const MAX_DEPOSIT = 10000;

/** Create a Stripe Checkout session for card deposit. In production, use Stripe SDK and return session URL. */
export async function POST(req: NextRequest) {
  const nextAuth = await auth();
  const legacy = await getLegacySession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit429(`deposit_card:${userId}`, 10, 60 * 1000, "Too many requests.");
  if (rl) return rl;

  let body: { amount?: number; successUrl?: string; cancelUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
    return NextResponse.json(
      { error: `Amount must be between ${MIN_DEPOSIT} and ${MAX_DEPOSIT}` },
      { status: 400 }
    );
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
      placeholder: true,
      amount,
    });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20.acacia" });
    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: "Chaotix Platform Balance",
              description: "Deposit to your Chaotix trading balance",
            },
          },
          quantity: 1,
        },
      ],
      success_url: body.successUrl ?? `${origin}/wallet?deposit=success`,
      cancel_url: body.cancelUrl ?? `${origin}/wallet`,
      client_reference_id: userId,
      metadata: { userId, amount: String(amount) },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      amount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
