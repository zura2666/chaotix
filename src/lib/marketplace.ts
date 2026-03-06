/**
 * Marketplace: universal Asset + order-book price discovery.
 * Rules: lowest ask = sell price; highest bid = buy pressure; market price = last trade.
 * Phase 2: liquidity scoring, holdings, watchlist, cancel orders, trade history.
 */

import { prisma } from "./db";
import { getOrderBook } from "./trading-orderbook";

const LIQUIDITY_24H_MS = 24 * 60 * 60 * 1000;

/** Phase 4: trades with total value >= this use escrow (buyer receives asset on release). */
export const ESCROW_THRESHOLD = 500;

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Get or create holding for user/asset (call inside transaction). */
async function getOrCreateHolding(tx: Tx, userId: string, assetId: string): Promise<{ id: string; quantity: number }> {
  let h = await tx.assetHolding.findUnique({
    where: { userId_assetId: { userId, assetId } },
    select: { id: true, quantity: true },
  });
  if (!h) {
    const created = await tx.assetHolding.create({
      data: { userId, assetId, quantity: 0 },
      select: { id: true, quantity: true },
    });
    h = created;
  }
  return { id: h.id, quantity: h.quantity };
}

export type SupplyModel = "fixed" | "limited" | "unlimited";

export type AssetWithCreator = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  creatorId: string;
  supplyModel: string;
  totalSupply: number;
  maxSupply: number | null;
  currentPrice: number;
  marketCap: number;
  liquidityScore: number;
  demandScore: number;
  verificationStatus: string;
  frozenAt: Date | null;
  commentCount: number;
  shareCount: number;
  communitySentimentScore: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: string | null;
  creator: {
    id: string;
    name: string | null;
    username: string | null;
    marketplaceVerifiedAt?: Date | null;
    marketplaceTrustScore?: number;
  };
};

export type OrderBookLevel = { price: number; quantity: number };

/** Get asset by id with creator (Phase 4: trust fields). */
export async function getAsset(id: string): Promise<AssetWithCreator | null> {
  const a = await prisma.asset.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          marketplaceVerifiedAt: true,
          marketplaceTrustScore: true,
        },
      },
    },
  });
  return a as AssetWithCreator | null;
}

/** List assets (paginated). */
export async function listAssets(opts: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<AssetWithCreator[]> {
  const limit = Math.min(100, opts.limit ?? 20);
  const offset = opts.offset ?? 0;
  const where = opts.category ? { category: opts.category } : {};
  const list = await prisma.asset.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          marketplaceVerifiedAt: true,
          marketplaceTrustScore: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
  });
  return list as AssetWithCreator[];
}

/** Search and filter assets (fuzzy title/description, category, price, volume, demand, liquidity). */
export async function searchAssets(opts: {
  q?: string;
  category?: string;
  sortBy?: "trending" | "volume" | "demand" | "liquidity" | "price" | "newest";
  minPrice?: number;
  maxPrice?: number;
  minVolume24h?: number;
  minDemandScore?: number;
  minLiquidityScore?: number;
  limit?: number;
  offset?: number;
}): Promise<AssetWithCreator[]> {
  const limit = Math.min(100, opts.limit ?? 20);
  const offset = opts.offset ?? 0;
  const where: Record<string, unknown> = { frozenAt: null };
  if (opts.category) where.category = opts.category;
  if (opts.minPrice != null || opts.maxPrice != null) {
    where.currentPrice = {};
    if (opts.minPrice != null) (where.currentPrice as Record<string, number>).gte = opts.minPrice;
    if (opts.maxPrice != null) (where.currentPrice as Record<string, number>).lte = opts.maxPrice;
  }
  if (opts.minVolume24h != null) where.volume24h = { gte: opts.minVolume24h };
  if (opts.minDemandScore != null) where.demandScore = { gte: opts.minDemandScore };
  if (opts.minLiquidityScore != null) where.liquidityScore = { gte: opts.minLiquidityScore };
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  const orderByMap = {
    trending: { trendingScore: "desc" as const },
    volume: { volume24h: "desc" as const },
    demand: { demandScore: "desc" as const },
    liquidity: { liquidityScore: "desc" as const },
    price: { currentPrice: "desc" as const },
    newest: { createdAt: "desc" as const },
  };
  const orderBy = orderByMap[opts.sortBy ?? "newest"] ?? orderByMap.newest;
  const list = await prisma.asset.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          marketplaceVerifiedAt: true,
          marketplaceTrustScore: true,
        },
      },
    },
    orderBy,
    take: limit,
    skip: offset,
  });
  return list as AssetWithCreator[];
}


/** Phase 4: release escrow to buyer (credits buyer holding) or refund (credits seller back). */
export async function resolveEscrow(
  escrowId: string,
  resolution: "release" | "refund",
  resolvedById: string
): Promise<{ ok: true } | { error: string }> {
  const escrow = await prisma.marketplaceEscrow.findUnique({
    where: { id: escrowId },
    include: { trade: true },
  });
  if (!escrow) return { error: "Escrow not found" };
  if (escrow.status !== "held") return { error: "Escrow already resolved" };

  await prisma.$transaction(async (tx) => {
    if (resolution === "release") {
      const buyerH = await getOrCreateHolding(tx, escrow.buyerId, escrow.assetId);
      await tx.assetHolding.update({
        where: { id: buyerH.id },
        data: { quantity: { increment: escrow.quantity } },
      });
    } else {
      const sellerH = await getOrCreateHolding(tx, escrow.sellerId, escrow.assetId);
      await tx.assetHolding.update({
        where: { id: sellerH.id },
        data: { quantity: { increment: escrow.quantity } },
      });
    }
    await tx.marketplaceEscrow.update({
      where: { id: escrowId },
      data: {
        status: resolution === "release" ? "released" : "refunded",
        releasedAt: new Date(),
      },
    });
  });

  const { updateUserMarketplaceTrust } = await import("./marketplace-trust");
  await Promise.all([
    updateUserMarketplaceTrust(escrow.buyerId),
    updateUserMarketplaceTrust(escrow.sellerId),
  ]);
  return { ok: true };
}

/** Create asset (issuer/creator). Optional initialSupply gives creator that holding so they can list. */
export async function createAsset(
  creatorId: string,
  data: {
    title: string;
    category: string;
    description?: string | null;
    supplyModel: SupplyModel;
    maxSupply?: number | null;
    metadata?: string | null;
    initialSupply?: number;
  }
): Promise<{ id: string } | { error: string }> {
  if (!data.title?.trim()) return { error: "Title required" };
  const supplyModel = data.supplyModel ?? "unlimited";
  const maxSupply = supplyModel === "unlimited" ? null : (data.maxSupply ?? 0);
  const initialSupply = Math.max(0, data.initialSupply ?? 0);
  const asset = await prisma.asset.create({
    data: {
      title: data.title.trim(),
      category: data.category?.trim() || "other",
      description: data.description?.trim() ?? null,
      creatorId,
      supplyModel,
      totalSupply: initialSupply,
      maxSupply,
      currentPrice: 0,
      marketCap: 0,
      metadata: data.metadata ?? null,
    },
  });
  if (initialSupply > 0) {
    await prisma.assetHolding.upsert({
      where: { userId_assetId: { userId: creatorId, assetId: asset.id } },
      create: { userId: creatorId, assetId: asset.id, quantity: initialSupply },
      update: { quantity: { increment: initialSupply } },
    });
  }
  return { id: asset.id };
}

/** Recent trades for an asset. */
export async function getAssetTrades(assetId: string, limit = 50) {
  return prisma.assetTrade.findMany({
    where: { assetId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      buyer: { select: { id: true, name: true, username: true } },
      seller: { select: { id: true, name: true, username: true } },
    },
  });
}

/** Liquidity: volume (24h), active traders (24h), spread, depth. Score 0–100. */
export async function updateAssetLiquidity(assetId: string): Promise<void> {
  const since = new Date(Date.now() - LIQUIDITY_24H_MS);
  const [trades24h, orderBook] = await Promise.all([
    prisma.assetTrade.findMany({
      where: { assetId, createdAt: { gte: since } },
      select: { quantity: true, unitPrice: true, buyerId: true, sellerId: true },
    }),
    getOrderBook(assetId),
  ]);
  const volume24h = trades24h.reduce((s, t) => s + t.quantity * t.unitPrice, 0);
  const uniqueTraders = new Set<string>();
  for (const t of trades24h) {
    uniqueTraders.add(t.buyerId);
    uniqueTraders.add(t.sellerId);
  }
  const activeTraders24h = uniqueTraders.size;
  const spread =
    orderBook.lowestAsk != null && orderBook.highestBid != null
      ? orderBook.lowestAsk - orderBook.highestBid
      : null;
  const depth =
    orderBook.asks.reduce((s, a) => s + a.quantity, 0) + orderBook.bids.reduce((s, b) => s + b.quantity, 0);
  const mid = orderBook.lowestAsk ?? orderBook.highestBid ?? 1;
  const spreadPct = spread != null && mid > 0 ? (spread / mid) * 100 : 100;
  const liquidityScore = Math.min(
    100,
    Math.round(
      Math.log1p(volume24h) * 5 +
      activeTraders24h * 3 +
      Math.log1p(depth) * 2 -
      Math.min(50, spreadPct * 2)
    )
  );
  const demandScore = Math.min(
    100,
    Math.round(
      (orderBook.bids.reduce((s, b) => s + b.quantity * b.price, 0) / (mid * depth + 1)) * 10
    )
  );
  await prisma.asset.update({
    where: { id: assetId },
    data: {
      volume24h,
      activeTraders24h,
      liquidityScore: Math.max(0, liquidityScore),
      demandScore: Math.max(0, Math.min(100, demandScore)),
    },
  });
}

/** Get liquidity indicators for display (computed if not cached). */
export async function getLiquidityIndicators(assetId: string): Promise<{
  liquidityScore: number;
  demandScore: number;
  volume24h: number;
  activeTraders24h: number;
  spread: number | null;
  orderBookDepth: number;
}> {
  const [asset, orderBook] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      select: { liquidityScore: true, demandScore: true, volume24h: true, activeTraders24h: true },
    }),
    getOrderBook(assetId),
  ]);
  const spread =
    orderBook.lowestAsk != null && orderBook.highestBid != null
      ? orderBook.lowestAsk - orderBook.highestBid
      : null;
  const orderBookDepth =
    orderBook.asks.reduce((s, a) => s + a.quantity, 0) + orderBook.bids.reduce((s, b) => s + b.quantity, 0);
  return {
    liquidityScore: asset?.liquidityScore ?? 0,
    demandScore: asset?.demandScore ?? 0,
    volume24h: asset?.volume24h ?? 0,
    activeTraders24h: asset?.activeTraders24h ?? 0,
    spread,
    orderBookDepth,
  };
}



/** Watchlist: add asset. */
export async function watchlistAdd(userId: string, assetId: string): Promise<{ ok: boolean; error?: string }> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
  if (!asset) return { ok: false, error: "Asset not found" };
  await prisma.marketplaceWatchlist.upsert({
    where: { userId_assetId: { userId, assetId } },
    create: { userId, assetId },
    update: {},
  });
  return { ok: true };
}

/** Watchlist: remove asset. */
export async function watchlistRemove(userId: string, assetId: string): Promise<{ ok: boolean }> {
  await prisma.marketplaceWatchlist.deleteMany({
    where: { userId, assetId },
  });
  return { ok: true };
}

/** Watchlist: list asset ids for user. */
export async function watchlistAssetIds(userId: string): Promise<string[]> {
  const rows = await prisma.marketplaceWatchlist.findMany({
    where: { userId },
    select: { assetId: true },
  });
  return rows.map((r) => r.assetId);
}

/** Watchlist: list assets with details for user. */
export async function watchlistAssets(userId: string): Promise<AssetWithCreator[]> {
  const list = await prisma.marketplaceWatchlist.findMany({
    where: { userId },
    include: {
      asset: {
        include: {
          creator: { select: { id: true, name: true, username: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return list.map((w) => w.asset as AssetWithCreator);
}

/** Portfolio: user holdings with asset info. */
export async function getPortfolio(userId: string): Promise<
  {
    assetId: string;
    asset: AssetWithCreator;
    quantity: number;
    value: number;
  }[]
> {
  const holdings = await prisma.assetHolding.findMany({
    where: { userId, quantity: { gt: 0 } },
    include: {
      asset: {
        include: {
          creator: { select: { id: true, name: true, username: true } },
        },
      },
    },
  });
  return holdings.map((h) => ({
    assetId: h.assetId,
    asset: h.asset as AssetWithCreator,
    quantity: h.quantity,
    value: h.quantity * (h.asset.currentPrice || 0),
  }));
}

/** User trade history (all assets or single asset). */
export async function getUserTradeHistory(
  userId: string,
  opts: { assetId?: string; limit?: number }
) {
  const where = {
    OR: [{ buyerId: userId }, { sellerId: userId }],
    ...(opts.assetId ? { assetId: opts.assetId } : {}),
  };
  const limit = Math.min(100, opts.limit ?? 50);
  return prisma.assetTrade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      asset: { select: { id: true, title: true, currentPrice: true } },
      buyer: { select: { id: true, name: true, username: true } },
      seller: { select: { id: true, name: true, username: true } },
    },
  });
}

/** Get user's holding quantity for an asset. */
export async function getUserHolding(userId: string, assetId: string): Promise<number> {
  const h = await prisma.assetHolding.findUnique({
    where: { userId_assetId: { userId, assetId } },
    select: { quantity: true },
  });
  return h?.quantity ?? 0;
}

/** User open orders (listings + bids) for an asset or all. */
export async function getUserOpenOrders(userId: string, assetId?: string) {
  const openOrders = await prisma.order.findMany({
    where: { userId, status: { in: ["open", "partial"] }, ...(assetId ? { assetId } : {}) },
    include: { asset: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const listings = openOrders.filter(o => o.type === "sell").map(o => ({ ...o, unitPrice: o.price || 0 }));
  const bids = openOrders.filter(o => o.type === "buy").map(o => ({ ...o, unitPrice: o.price || 0 }));

  return { listings, bids };
}
