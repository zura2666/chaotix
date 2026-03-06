import { prisma } from "./db";

export async function detectCoordinatedPump(marketId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const trades = await prisma.trade.findMany({
    where: { marketId, createdAt: { gte: since } },
    select: { userId: true, total: true },
  });
  const byUser = new Map<string, number>();
  trades.forEach((t) => byUser.set(t.userId, (byUser.get(t.userId) ?? 0) + t.total));
  const volumes = Array.from(byUser.values()).sort((a, b) => b - a);
  const top2 = (volumes[0] ?? 0) + (volumes[1] ?? 0);
  const total = volumes.reduce((a, b) => a + b, 0);
  if (total < 500) return false;
  return top2 / total > 0.8;
}

export async function createManipulationAlert(params: {
  type: string;
  severity?: string;
  resource?: string;
  resourceId?: string;
  message: string;
  payload?: string;
}) {
  await prisma.manipulationAlert.create({
    data: {
      type: params.type,
      severity: params.severity ?? "medium",
      resource: params.resource,
      resourceId: params.resourceId,
      message: params.message,
      payload: params.payload,
    },
  });
}

export async function getUnreadManipulationAlerts(limit = 50) {
  return prisma.manipulationAlert.findMany({
    where: { readAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
