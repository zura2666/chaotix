import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { rateLimit429 } from "@/lib/rate-limit";

const MIN_DEPOSIT = 5;
const MAX_DEPOSIT = 5000;

/** Create a PayPal order for depositing. In production, use PayPal SDK and return order ID / approval URL. */
export async function POST(req: NextRequest) {
  const nextAuth = await auth();
  const legacy = await getLegacySession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit429(`deposit_paypal:${userId}`, 10, 60 * 1000, "Too many requests.");
  if (rl) return rl;

  let body: { amount?: number };
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

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  if (!paypalClientId) {
    return NextResponse.json({
      error: "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      placeholder: true,
      amount,
    });
  }

  return NextResponse.json({
    orderId: `paypal_${userId}_${Date.now()}`,
    amount,
    message: "Complete payment in the popup. Your balance will update after confirmation.",
  });
}
