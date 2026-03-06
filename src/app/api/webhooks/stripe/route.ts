import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { creditBalance } from "@/lib/platform-balance";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20.acacia" });
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id ?? session.metadata?.userId;
  const amountRaw = session.metadata?.amount;
  const amount = amountRaw ? parseFloat(amountRaw) : (session.amount_total ?? 0) / 100;

  if (!userId || amount <= 0) {
    return NextResponse.json({ error: "Missing userId or amount" }, { status: 400 });
  }

  const existing = await prisma.deposit.findFirst({
    where: { userId, externalId: session.id, method: "card" },
  });
  if (existing) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  await prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        userId,
        method: "card",
        asset: "USD",
        amount,
        status: "confirmed",
        externalId: session.id,
      },
    });
    await creditBalance(userId, amount, tx as Parameters<typeof creditBalance>[2]);
    await tx.auditLog.create({
      data: {
        userId,
        action: "deposit_confirmed",
        resource: "Deposit",
        details: JSON.stringify({ depositId: deposit.id, method: "card", amount, externalId: session.id }),
      },
    });
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
