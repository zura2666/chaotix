import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  }).then((u) => u?.isAdmin ?? false);

  const where = isAdmin
    ? { status: "held" }
    : { status: "held", OR: [{ buyerId: user.id }, { sellerId: user.id }] };

  const escrows = await prisma.marketplaceEscrow.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      trade: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          createdAt: true,
          asset: { select: { id: true, title: true } },
        },
      },
      buyer: { select: { id: true, username: true, name: true } },
      seller: { select: { id: true, username: true, name: true } },
    },
  });
  return NextResponse.json(escrows);
}
