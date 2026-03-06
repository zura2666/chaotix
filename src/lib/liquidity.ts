/**
 * Liquidity provider: add/remove liquidity, LP token minting, fee distribution.
 */

import { prisma } from "./db";
import { LP_FEE_BPS, TRADING_FEE_BPS, MARKET_STATUS_ARCHIVED } from "./constants";
import { roundMoney } from "./position-pnl";

function roundLp(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * Add liquidity: user deposits tokens; we mint shares into pool and give LP tokens.
 * reserveT and reserveS increase; price unchanged.
 */
export async function addLiquidity(params: {
  userId: string;
  marketId: string;
  tokensIn: number;
}) {
  const { userId, marketId, tokensIn } = params;
  if (!Number.isFinite(tokensIn) || tokensIn <= 0) {
    return { error: "Invalid amount" };
  }

  const [user, market] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.market.findUnique({
      where: { id: marketId },
      include: { liquidityPositions: true },
    }),
  ]);
  if (!user || user.isBanned) return { error: "Unauthorized" };
  if (user.balance < tokensIn) return { error: "Insufficient balance" };
  if (!market) return { error: "Market not found" };
  if (market.status === MARKET_STATUS_ARCHIVED) return { error: "Market is archived" };
  if (market.reserveTokens <= 0 || market.reserveShares <= 0) {
    return { error: "Market pool not initialized" };
  }

  const reserveT = market.reserveTokens;
  const reserveS = market.reserveShares;
  const sharesToMint = (tokensIn / reserveT) * reserveS;
  const totalLpTokens = market.totalLpTokens ?? 0;

  let lpMinted: number;
  if (totalLpTokens <= 0) {
    lpMinted = Math.sqrt(tokensIn * sharesToMint);
  } else {
    lpMinted = (tokensIn / reserveT) * totalLpTokens;
  }
  lpMinted = roundLp(lpMinted);
  if (lpMinted <= 0) return { error: "Amount too small" };

  const existing = market.liquidityPositions.find((p) => p.userId === userId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: tokensIn } },
    });
    if (existing) {
      await tx.liquidityPosition.update({
        where: { id: existing.id },
        data: {
          tokensDeposited: { increment: tokensIn },
          sharesDeposited: { increment: sharesToMint },
          lpTokens: { increment: lpMinted },
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.liquidityPosition.create({
        data: {
          userId,
          marketId,
          tokensDeposited: tokensIn,
          sharesDeposited: sharesToMint,
          lpTokens: lpMinted,
          feesEarned: 0,
        },
      });
    }
    await tx.market.update({
      where: { id: marketId },
      data: {
        reserveTokens: { increment: tokensIn },
        reserveShares: { increment: sharesToMint },
        totalLpTokens: { increment: lpMinted },
      },
    });
    // Sync LiquidityPool (Phase 6): totalLiquidity = reserveTokens, totalLpShares = totalLpTokens
    const newReserveT = reserveT + tokensIn;
    const newTotalLp = (market.totalLpTokens ?? 0) + lpMinted;
    await tx.liquidityPool.upsert({
      where: { marketId },
      create: { marketId, totalLiquidity: newReserveT, totalLpShares: newTotalLp },
      update: { totalLiquidity: newReserveT, totalLpShares: newTotalLp },
    });
  });

  return {
    success: true,
    tokensIn,
    sharesMinted: roundLp(sharesToMint),
    lpTokens: lpMinted,
  };
}

/**
 * Remove liquidity: burn lpTokens, return tokens + shares to user, plus accrued fees.
 */
export async function removeLiquidity(params: {
  userId: string;
  marketId: string;
  lpTokensToBurn: number;
}) {
  const { userId, marketId, lpTokensToBurn } = params;
  if (!Number.isFinite(lpTokensToBurn) || lpTokensToBurn <= 0) {
    return { error: "Invalid amount" };
  }

  const lp = await prisma.liquidityPosition.findUnique({
    where: { userId_marketId: { userId, marketId } },
  });
  if (!lp || lp.lpTokens < lpTokensToBurn) {
    return { error: "Insufficient LP tokens" };
  }

  const market = await prisma.market.findUnique({
    where: { id: marketId },
  });
  if (!market || market.status === MARKET_STATUS_ARCHIVED) {
    return { error: "Market not found or archived" };
  }

  const totalLp = market.totalLpTokens ?? 0;
  if (totalLp <= 0) return { error: "No liquidity" };

  const share = lpTokensToBurn / totalLp;
  const tokensOut = roundMoney(share * market.reserveTokens);
  const sharesOut = roundLp(share * market.reserveShares);
  const feesToCredit = roundMoney((lpTokensToBurn / lp.lpTokens) * lp.feesEarned);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: tokensOut + feesToCredit } },
    });
    await tx.liquidityPosition.update({
      where: { id: lp.id },
      data: {
        tokensDeposited: { decrement: tokensOut },
        sharesDeposited: { decrement: sharesOut },
        lpTokens: { decrement: lpTokensToBurn },
        feesEarned: { decrement: feesToCredit },
        updatedAt: new Date(),
      },
    });
    await tx.market.update({
      where: { id: marketId },
      data: {
        reserveTokens: { decrement: tokensOut },
        reserveShares: { decrement: sharesOut },
        totalLpTokens: { decrement: lpTokensToBurn },
      },
    });
    // Sync LiquidityPool
    const newReserveT = market.reserveTokens - tokensOut;
    const newTotalLp = totalLp - lpTokensToBurn;
    await tx.liquidityPool.upsert({
      where: { marketId },
      create: { marketId, totalLiquidity: newReserveT, totalLpShares: newTotalLp },
      update: { totalLiquidity: newReserveT, totalLpShares: newTotalLp },
    });
  });

  return {
    success: true,
    tokensOut,
    sharesOut,
    feesWithdrawn: feesToCredit,
  };
}

/**
 * Distribute a trade fee to LPs. Call this from executeBuy/executeSell.
 */
export async function distributeFeeToLps(marketId: string, feeAmount: number): Promise<void> {
  if (feeAmount <= 0) return;
  const lpShare = (feeAmount * LP_FEE_BPS) / TRADING_FEE_BPS;
  if (lpShare <= 0) return;

  const [market, positions] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: { totalLpTokens: true, id: true },
    }),
    prisma.liquidityPosition.findMany({
      where: { marketId, lpTokens: { gt: 0 } },
      select: { id: true, lpTokens: true },
    }),
  ]);
  if (!market || (market.totalLpTokens ?? 0) <= 0 || positions.length === 0) {
    return;
  }

  const totalLp = market.totalLpTokens!;
  const updates = positions.map((p) => {
    const share = p.lpTokens / totalLp;
    const amount = roundMoney(lpShare * share);
    return { id: p.id, amount };
  }).filter((u) => u.amount > 0);

  await prisma.$transaction([
    prisma.market.update({
      where: { id: marketId },
      data: { totalLpFeesAccrued: { increment: lpShare } },
    }),
    ...updates.map(({ id, amount }) =>
      prisma.liquidityPosition.update({
        where: { id },
        data: { feesEarned: { increment: amount } },
      })
    ),
  ]);
}

/**
 * Get LP summary for a market: total liquidity, top LPs, APR estimate.
 */
export async function getMarketLpSummary(marketId: string) {
  const [market, positions] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: {
        reserveTokens: true,
        reserveShares: true,
        totalLpTokens: true,
        totalLpFeesAccrued: true,
        volume: true,
        createdAt: true,
      },
    }),
    prisma.liquidityPosition.findMany({
      where: { marketId, lpTokens: { gt: 0 } },
      orderBy: { lpTokens: "desc" },
      take: 10,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  if (!market) return null;
  const totalLp = market.totalLpTokens ?? 0;
  const totalValue = (market.reserveTokens ?? 0) * 2;
  const ageDays = (Date.now() - market.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  const feesPerDay = ageDays > 0 ? (market.totalLpFeesAccrued ?? 0) / ageDays : 0;
  const apr = totalValue > 0 && feesPerDay > 0
    ? (feesPerDay * 365 / totalValue) * 100
    : 0;

  return {
    totalTokens: market.reserveTokens,
    totalShares: market.reserveShares,
    totalLpTokens: totalLp,
    totalLpFeesAccrued: market.totalLpFeesAccrued ?? 0,
    topLps: positions.map((p) => ({
      user: p.user,
      lpTokens: p.lpTokens,
      sharePct: totalLp > 0 ? (p.lpTokens / totalLp) * 100 : 0,
      feesEarned: p.feesEarned,
    })),
    aprEstimate: Math.round(apr * 100) / 100,
  };
}
