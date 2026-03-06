import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditBalance } from "@/lib/platform-balance";

// Production: verify with PayPal SDK (certificate-based). See https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let body: { event_type?: string; resource?: { id?: string; purchase_units?: Array<{ reference_id?: string; amount?: { value?: string } }> } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event_type !== "PAYMENT.CAPTURE.COMPLETED" && body.event_type !== "CHECKOUT.ORDER.APPROVED") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const resource = body.resource;
  const orderId = resource?.id;
  const purchaseUnits = resource?.purchase_units;
  const amountStr = purchaseUnits?.[0]?.amount?.value;
  const amount = amountStr ? parseFloat(amountStr) : 0;
  const referenceId = purchaseUnits?.[0]?.reference_id ?? "";

  const userId = referenceId.startsWith("chaotix_") ? referenceId.replace("chaotix_", "").split("_")[0] : null;
  if (!userId || amount <= 0) {
    return NextResponse.json({ error: "Missing userId or amount" }, { status: 400 });
  }

  const existing = await prisma.deposit.findFirst({
    where: { userId, externalId: orderId, method: "paypal" },
  });
  if (existing) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  await prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        userId,
        method: "paypal",
        asset: "USD",
        amount,
        status: "confirmed",
        externalId: orderId,
      },
    });
    await creditBalance(userId, amount, tx as Parameters<typeof creditBalance>[2]);
    await tx.auditLog.create({
      data: {
        userId,
        action: "deposit_confirmed",
        resource: "Deposit",
        details: JSON.stringify({ depositId: deposit.id, method: "paypal", amount, externalId: orderId }),
      },
    });
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
