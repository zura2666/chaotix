import { prisma } from "./db";
import { ESCROW_THRESHOLD } from "./marketplace";
import { emitOrderBookUpdated, emitTradeExecuted, emitPriceUpdated } from "./ws-emitter";
import { updateMarketMetrics } from "./market-metrics";

export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market";
export type OrderStatus = "open" | "partial" | "filled" | "cancelled";

export type OrderBookLevel = { price: number; quantity: number; cumulative: number };
export type ProfessionalOrderBook = {
  assetId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  highestBid: number | null;
  lowestAsk: number | null;
  spread: number | null;
  depthBid: number;
  depthAsk: number;
  updatedAt: string;
};

function aggregateLevels(rows: { price: number; quantity: number }[], sort: "desc" | "asc"): OrderBookLevel[] {
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.price, (map.get(r.price) ?? 0) + r.quantity);
  const levels = Array.from(map.entries()).map(([price, quantity]) => ({ price, quantity }));
  levels.sort((a, b) => (sort === "desc" ? b.price - a.price : a.price - b.price));
  let cumulative = 0;
  return levels.map((l) => {
    cumulative += l.quantity;
    return { ...l, cumulative };
  });
}

async function upsertSnapshot(assetId: string, bids: OrderBookLevel[], asks: OrderBookLevel[]) {
  await prisma.orderBookSnapshot.upsert({
    where: { assetId },
    create: { assetId, bids: JSON.stringify(bids), asks: JSON.stringify(asks) },
    update: { bids: JSON.stringify(bids), asks: JSON.stringify(asks) },
  });
}

export async function getOrderBook(assetId: string): Promise<ProfessionalOrderBook> {
  const openOrders = await prisma.order.findMany({
    where: { assetId, status: { in: ["open", "partial"] }, asset: { frozenAt: null } },
    select: { type: true, orderType: true, price: true, quantity: true, filledQuantity: true },
  });

  const askRows: { price: number; quantity: number }[] = [];
  const bidRows: { price: number; quantity: number }[] = [];

  for (const o of openOrders) {
    if (o.orderType !== "limit") continue;
    if (typeof o.price !== "number") continue;
    const remaining = Math.max(0, o.quantity - o.filledQuantity);
    if (remaining <= 0) continue;

    if (o.type === "buy") {
      bidRows.push({ price: o.price, quantity: remaining });
    } else {
      askRows.push({ price: o.price, quantity: remaining });
    }
  }

  const bids = aggregateLevels(bidRows, "desc");
  const asks = aggregateLevels(askRows, "asc");
  const highestBid = bids[0]?.price ?? null;
  const lowestAsk = asks[0]?.price ?? null;
  const spread = highestBid != null && lowestAsk != null ? Math.max(0, lowestAsk - highestBid) : null;
  const depthBid = bids.length ? bids[bids.length - 1].cumulative : 0;
  const depthAsk = asks.length ? asks[asks.length - 1].cumulative : 0;

  upsertSnapshot(assetId, bids, asks).catch(() => { });

  const result = {
    assetId,
    bids,
    asks,
    highestBid,
    lowestAsk,
    spread,
    depthBid,
    depthAsk,
    updatedAt: new Date().toISOString(),
  };

  emitOrderBookUpdated(assetId, result);

  return result;
}

export async function matchOrders(assetId: string): Promise<string[]> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.frozenAt) return [];

  const tradeIds: string[] = [];
  let shouldMatch = true;

  while (shouldMatch) {
    const buyOrders = await prisma.order.findMany({
      where: { assetId, type: "buy", status: { in: ["open", "partial"] } },
      orderBy: [{ price: "desc" }, { createdAt: "asc" }],
    });
    const sellOrders = await prisma.order.findMany({
      where: { assetId, type: "sell", status: { in: ["open", "partial"] } },
      orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    });

    const highestBid = buyOrders.find(o => o.orderType === "market" || (o.orderType === "limit" && o.price !== null));
    const lowestAsk = sellOrders.find(o => o.orderType === "limit" && o.price !== null);

    if (!highestBid || !lowestAsk) {
      shouldMatch = false;
      break;
    }

    const highestBidPrice = highestBid.orderType === "market" ? Infinity : highestBid.price!;
    const lowestAskPrice = lowestAsk.price!;

    if (highestBidPrice < lowestAskPrice) {
      shouldMatch = false;
      break;
    }

    const execPrice = lowestAskPrice;
    const bidRemaining = highestBid.quantity - highestBid.filledQuantity;
    const askRemaining = lowestAsk.quantity - lowestAsk.filledQuantity;

    const fillQty = Math.min(bidRemaining, askRemaining);
    if (fillQty <= 0) break;

    const total = fillQty * execPrice;
    const useEscrow = total >= ESCROW_THRESHOLD;

    await prisma.$transaction(async (tx) => {
      // Create Trade
      const trade = await tx.assetTrade.create({
        data: {
          assetId,
          buyerId: highestBid.userId,
          sellerId: lowestAsk.userId,
          quantity: fillQty,
          unitPrice: execPrice,
        },
      });
      tradeIds.push(trade.id);

      // Handle escrow/holdings
      if (useEscrow) {
        await tx.marketplaceEscrow.create({
          data: {
            tradeId: trade.id,
            assetId,
            sellerId: lowestAsk.userId,
            buyerId: highestBid.userId,
            quantity: fillQty,
            unitPrice: execPrice,
            status: "held",
          },
        });
      } else {
        const hBuy = await tx.assetHolding.upsert({
          where: { userId_assetId: { userId: highestBid.userId, assetId } },
          create: { userId: highestBid.userId, assetId, quantity: fillQty },
          update: { quantity: { increment: fillQty } },
        });
      }
      const hSell = await tx.assetHolding.findUnique({
        where: { userId_assetId: { userId: lowestAsk.userId, assetId } },
      });
      if (hSell) {
        await tx.assetHolding.update({
          where: { id: hSell.id },
          data: { quantity: { decrement: fillQty } },
        });
      }

      // Update Order Status
      const buyFilled = highestBid.filledQuantity + fillQty;
      const buyStatus = buyFilled >= highestBid.quantity ? "filled" : "partial";
      await tx.order.update({
        where: { id: highestBid.id },
        data: { filledQuantity: buyFilled, status: buyStatus },
      });

      const sellFilled = lowestAsk.filledQuantity + fillQty;
      const sellStatus = sellFilled >= lowestAsk.quantity ? "filled" : "partial";
      await tx.order.update({
        where: { id: lowestAsk.id },
        data: { filledQuantity: sellFilled, status: sellStatus },
      });

      // Update Asset Price
      await tx.assetPricePoint.create({
        data: { assetId, price: execPrice },
      });
      await tx.asset.update({
        where: { id: assetId },
        data: {
          currentPrice: execPrice,
          marketCap: asset.totalSupply * execPrice,
          updatedAt: new Date(),
        },
      });
    });
  }

  if (tradeIds.length > 0) {
    import("./marketplace").then(({ updateAssetLiquidity }) => updateAssetLiquidity(assetId).catch(() => { }));
    import("./marketplace-trust").then(({ updateUserMarketplaceTrust }) => {
      prisma.assetTrade.findMany({ where: { id: { in: tradeIds } }, select: { buyerId: true, sellerId: true } }).then(trades => {
        const userIds = Array.from(new Set(trades.flatMap(t => [t.buyerId, t.sellerId])));
        userIds.forEach(id => updateUserMarketplaceTrust(id).catch(() => { }));
      });
    });
    import("./marketplace-activity").then(({ recordAssetTrade }) => {
      prisma.assetTrade.findMany({ where: { id: { in: tradeIds } }, select: { id: true, assetId: true, buyerId: true, sellerId: true, quantity: true, unitPrice: true } }).then((trades) => {
        trades.forEach((t) => recordAssetTrade(t.buyerId, { assetId: t.assetId, tradeId: t.id, quantity: t.quantity, unitPrice: t.unitPrice, sellerId: t.sellerId }).catch(() => { }));
      });
    });
    import("./marketplace-notifications").then(({ maybeNotifyPriceAlert }) => {
      prisma.asset.findUnique({ where: { id: assetId }, select: { currentPrice: true, title: true, updatedAt: true } }).then((a) => {
        if (a) {
          maybeNotifyPriceAlert(assetId, a.title, a.currentPrice).catch(() => { });
          emitPriceUpdated(assetId, a.currentPrice, a.updatedAt);
        }
      });
    });
    prisma.assetTrade.findMany({ where: { id: { in: tradeIds } } }).then(trades => {
      trades.forEach(t => emitTradeExecuted(assetId, t));
    }).catch(() => { });
  }

  getOrderBook(assetId).catch(() => { });
  if (tradeIds.length > 0) {
    updateMarketMetrics(assetId).catch(() => { });
  }
  return tradeIds;
}

export async function createOrder(params: {
  userId: string;
  assetId: string;
  type: OrderSide;
  orderType: OrderType;
  price?: number;
  quantity: number;
}): Promise<{ orderId: string; status: OrderStatus; tradeIds?: string[] } | { error: string }> {
  const quantity = Number(params.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "quantity must be positive" };

  const asset = await prisma.asset.findUnique({ where: { id: params.assetId } });
  if (!asset) return { error: "Asset not found" };
  if (asset.frozenAt) return { error: "Asset is temporarily frozen" };

  let price = null;
  if (params.orderType === "limit") {
    price = Number(params.price);
    if (!Number.isFinite(price) || price <= 0) return { error: "price required for limit order" };
  }

  if (params.type === "sell") {
    const sellerH = await prisma.assetHolding.findUnique({
      where: { userId_assetId: { userId: params.userId, assetId: params.assetId } },
      select: { quantity: true },
    });
    const sellerQty = sellerH?.quantity ?? 0;

    // Determine locked quantity from other open orders
    const openSells = await prisma.order.findMany({
      where: { userId: params.userId, assetId: params.assetId, type: "sell", status: { in: ["open", "partial"] } },
      select: { quantity: true, filledQuantity: true },
    });
    const lockedQty = openSells.reduce((sum, o) => sum + (o.quantity - o.filledQuantity), 0);

    if (sellerQty - lockedQty < quantity) {
      return { error: `Insufficient balance (have ${sellerQty}, locked ${lockedQty}, need ${quantity})` };
    }
  }

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      assetId: params.assetId,
      type: params.type,
      orderType: params.orderType,
      price,
      quantity,
      filledQuantity: 0,
      status: "open",
    },
    select: { id: true, status: true },
  });

  const tradeIds = await matchOrders(params.assetId);
  const updatedOrder = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });

  // For market orders, cancel any remaining unfilled portion
  if (params.orderType === "market" && updatedOrder?.status !== "filled") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });
    return { orderId: order.id, status: "cancelled", tradeIds };
  }

  return { orderId: order.id, status: (updatedOrder?.status as OrderStatus) ?? "open", tradeIds };
}

export async function cancelOrder(params: { orderId: string; userId: string }): Promise<{ ok: true } | { error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { id: true, userId: true, status: true, assetId: true },
  });
  if (!order) return { error: "Order not found" };
  if (order.userId !== params.userId) return { error: "Forbidden" };
  if (order.status === "filled" || order.status === "cancelled") return { error: "Order not cancellable" };

  await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
  getOrderBook(order.assetId).catch(() => { });
  return { ok: true };
}
