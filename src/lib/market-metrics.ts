import { prisma } from "./db";
import { getOrderBook } from "./trading-orderbook";

/**
 * Recalculates up-to-date market metrics for an asset and stores it in AssetMarketMetrics.
 * Includes: 24hVolume, 24hHigh, 24hLow, VWAP, liquidityScore, spreadPercentage.
 */
export async function updateMarketMetrics(assetId: string) {
  const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // 1. Fetch trades in the last 24h for volume, high, low, VWAP
    const trades24h = await prisma.assetTrade.findMany({
      where: {
        assetId,
        createdAt: { gte: ONE_DAY_AGO },
      },
      select: {
        quantity: true,
        unitPrice: true, // using unitPrice directly
      },
    });

    let volume24h = 0;
    let high24h = null;
    let low24h = null;
    let sumTotalValue = 0;
    let sumTotalQuantity = 0;

    for (const trade of trades24h) {
      const price = trade.unitPrice; // standard name from schema
      const qty = trade.quantity;
      const value = price * qty;

      volume24h += value;
      sumTotalValue += value;
      sumTotalQuantity += qty;

      if (high24h === null || price > high24h) high24h = price;
      if (low24h === null || price < low24h) low24h = price;
    }

    const vwap = sumTotalQuantity > 0 ? sumTotalValue / sumTotalQuantity : null;

    // 2. Fetch orderbook to calculate liquidityScore and spread
    const ob = await getOrderBook(assetId);
    let spreadPercentage = null;
    if (ob.highestBid && ob.lowestAsk && ob.highestBid > 0) {
      spreadPercentage = ((ob.lowestAsk - ob.highestBid) / ob.lowestAsk) * 100;
    }

    // simplistic liquidity score out of 100 based on depth + tight spread 
    let liquidityScore = 0;
    const combinedDepth = ob.depthBid + ob.depthAsk;
    if (combinedDepth > 0) {
      // Base score up to 60 based on raw depth
      liquidityScore += Math.min(60, Math.log1p(combinedDepth) * 10);

      // Bonus score up to 40 based on tight spread
      if (spreadPercentage !== null) {
        liquidityScore += Math.max(0, 40 - (spreadPercentage * 2));
      }
    }
    liquidityScore = Math.min(100, Math.max(0, Math.round(liquidityScore)));

    // 3. Upsert to AssetMarketMetrics
    await prisma.assetMarketMetrics.upsert({
      where: { assetId },
      create: {
        assetId,
        volume24h,
        high24h,
        low24h,
        vwap,
        liquidityScore,
        spreadPercentage,
      },
      update: {
        volume24h,
        high24h,
        low24h,
        vwap,
        liquidityScore,
        spreadPercentage,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[market-metrics] Error updating metrics", error);
    }
  }
}
