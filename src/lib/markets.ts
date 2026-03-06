import { prisma } from "./db";
import { sanitizeMarketString, toDisplayName } from "./strings";
import { validateIdentifierSafe, slugToDisplayName, normalizeForLookup } from "./identifiers";
import { resolveCanonical } from "./canonicalization";
import { conceptHash } from "./market-concept";
import {
  getPriceFromSupply,
  costToBuy,
  proceedsFromSell,
  sharesForBuyAmount,
  getInitialPrice,
} from "./amm";
import {
  buyQuote,
  sellQuote,
  getInitialReserves,
  getPriceFromReserves,
} from "./pool-amm";
import {
  TRADING_FEE_BPS,
  REFERRER_FEE_BPS,
  LP_FEE_BPS,
  TREASURY_FEE_BPS,
  MAX_NEW_MARKETS_PER_USER_PER_HOUR,
  MIN_INITIAL_BUY_TO_ACTIVATE,
  MARKET_CREATION_FEE,
  MARKET_CREATION_REFUND_TRADES,
  MARKET_CREATION_REFUND_UNIQUE_TRADERS,
} from "./constants";
import { getAdaptiveCooldownMs } from "./chaos-protection";
import {
  validateBuyAmount,
  validateSellShares,
  validateReferrer,
} from "./trade-validation";
import {
  phaseForDbAfterTrade,
  shouldTriggerCircuitBreaker,
  circuitBreakerCooldownMs,
  isMarketTradingPaused,
} from "./market-lifecycle";
import { tradeGuardBuy, tradeGuardSell } from "./trade-guard";
import { roundShares, realizedPnLOnSell, roundMoney } from "./position-pnl";
import { MARKET_STATUS_ARCHIVED } from "./constants";
import { eventBus, CHANNELS } from "./event-bus";
import { getMarketCreationLimit } from "./progressive-friction";
import { updateMarketMomentum } from "./momentum";
import { updateReputationAfterTrade, evaluateBadges } from "./reputation";
import { distributeFeeToLps } from "./liquidity";
import { recordEarlyTrader, getEarlyTraderFeeBps } from "./early-trader";
import { canUserTrade } from "./invite";
import { tryAwardFoundingTrader, getFoundingTraderFeeBps } from "./founding-traders";
import { updateAttentionAfterTrade } from "./attention";
import { updateMarketReputation } from "./market-reputation";
import { checkWashTrading, checkPriceSpike, checkLargeDrain, freezeMarketIfSuspicious } from "./anti-manipulation";
import {
  recordFeeCollected,
  recordReferralPayout,
  recordLpIncentive,
  recordTreasury,
  recordLiquiditySeed,
} from "./platform-token";
import { onReferralTrade } from "./growth-triggers";
import { runRiskChecks } from "./risk-engine";
import { updatePositionAfterBuy, updatePositionAfterSell } from "./positions";
import { awardCreatorFeeShare, checkCreatorMilestones } from "./creator-rewards";
import { updateMarketStage } from "./market-lifecycle-stage";
import { updateMarketMetrics } from "./market-metrics";
import { getAvailableBalance, debitAndLock, releaseLockAndCredit, creditBalance } from "./balance";
import { linkEntitiesToMarket } from "./entity-extraction";
import { computeClustersForMarket } from "./market-clustering";
import { updateMarketSentiment } from "./market-sentiment";
import { recordActivity } from "./activity-feed";
import { mirrorTradeForCopyFollowers } from "./copy-trading";
import { validateReferralNotAbuse } from "./referral-abuse";

function totalShares(market: { positions: { shares: number }[] }): number {
  return market.positions.reduce((s, p) => s + p.shares, 0);
}

/**
 * Phase 6: If market reaches 50 trades or 20 unique traders, refund creation fee to creator.
 */
export async function checkAndRefundMarketCreationFee(marketId: string): Promise<void> {
  const [feeRecord, market, uniqueCount] = await Promise.all([
    prisma.marketCreationFee.findFirst({
      where: { marketId, refunded: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.market.findUnique({
      where: { id: marketId },
      select: { tradeCount: true },
    }),
    prisma.trade.groupBy({
      by: ["marketId"],
      where: { marketId },
      _count: { userId: true },
    }),
  ]);
  if (!feeRecord || !market) return;
  const uniqueTraders = uniqueCount[0]?._count.userId ?? 0;
  const eligible =
    market.tradeCount >= MARKET_CREATION_REFUND_TRADES ||
    uniqueTraders >= MARKET_CREATION_REFUND_UNIQUE_TRADERS;
  if (!eligible) return;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: feeRecord.userId },
      data: {
        balance: { increment: feeRecord.amount },
        successfulMarkets: { increment: 1 },
      },
    }),
    prisma.marketCreationFee.update({
      where: { id: feeRecord.id },
      data: { refunded: true },
    }),
  ]);
}

function usePoolAmm(market: { reserveTokens: number; reserveShares: number }): boolean {
  return market.reserveTokens > 0 && market.reserveShares > 0;
}

export async function findOrCreateMarket(
  raw: string,
  userId?: string | null,
  metadata?: { title?: string; description?: string; categoryId?: string; tags?: string[]; isCoreMarket?: boolean }
) {
  const sanitized = sanitizeMarketString(raw);
  const resolved = await resolveCanonical(sanitized);
  if (resolved) {
    const market = await prisma.market.findUnique({ where: { canonical: resolved } });
    if (market) return { market };
  }

  const validated = validateIdentifierSafe(sanitized);
  if (!validated.ok) return { error: validated.error };
  const canonical = validated.value;
  let market = await prisma.market.findUnique({
    where: { canonical },
  });
  if (market) return { market };

  const isCore = metadata?.isCoreMarket === true;
  if (userId && !isCore) {
    const [user, createdCount, since] = [
      prisma.user.findUnique({
        where: { id: userId },
        select: { trustLevel: true, marketCreationLimit: true },
      }),
      prisma.market.count({ where: { createdById: userId } }),
      new Date(Date.now() - 60 * 60 * 1000),
    ];
    const [userRow, totalCreated] = await Promise.all([user, createdCount]);
    const limit = getMarketCreationLimit(userRow ?? {});
    if (totalCreated >= limit) {
      return { error: `Market creation limit reached (${limit}). Increase trust to create more.` };
    }
    const recentCount = await prisma.market.count({
      where: { createdById: userId, createdAt: { gte: since } },
    });
    if (recentCount >= MAX_NEW_MARKETS_PER_USER_PER_HOUR) {
      return { error: "Rate limit: try again later" };
    }
    const [lastCreated, cooldownMs] = await Promise.all([
      prisma.market.findFirst({
        where: { createdById: userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      getAdaptiveCooldownMs(),
    ]);
    if (lastCreated && Date.now() - lastCreated.createdAt.getTime() < cooldownMs) {
      return { error: "Wait a moment before creating another market" };
    }
  }

  const displayName = slugToDisplayName(canonical);
  const { reserveTokens, reserveShares } = getInitialReserves();
  const initialPrice = getPriceFromReserves(reserveTokens, reserveShares);
  const tagsValidated: string[] = metadata?.tags?.length
    ? metadata.tags
        .map((t) => validateIdentifierSafe(String(t).trim()))
        .filter((r): r is { ok: true; value: string } => r.ok)
        .map((r) => r.value)
    : [];
  const tagsJson =
    tagsValidated.length > 0 ? JSON.stringify(tagsValidated.slice(0, 10)) : "[]";

  // Phase 6: market creation fee (spam prevention) — skip for core markets (admin-created)
  if (userId && !isCore) {
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (creator && creator.balance < MARKET_CREATION_FEE) {
      return { error: `Market creation requires ${MARKET_CREATION_FEE} token fee. Insufficient balance.` };
    }
  }

  market = await prisma.market.create({
    data: {
      canonical,
      displayName,
      title: metadata?.title?.slice(0, 200) ?? null,
      description: metadata?.description?.slice(0, 2000) ?? null,
      tags: tagsJson,
      categoryId: metadata?.categoryId ?? null,
      price: initialPrice,
      volume: 0,
      tradeCount: 0,
      reserveTokens,
      reserveShares,
      createdById: userId ?? null,
      conceptHash: conceptHash(canonical),
      isCoreMarket: metadata?.isCoreMarket ?? false,
    },
  });
  await prisma.pricePoint.create({
    data: { marketId: market.id, price: market.price },
  });
  recordLiquiditySeed(market.id, reserveTokens, reserveShares).catch(() => {});
  if (userId) {
    await prisma.marketOwnership.create({
      data: { marketId: market.id, ownerId: userId, share: 1 },
    });
  }

  if (userId && MARKET_CREATION_FEE > 0) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: MARKET_CREATION_FEE },
          marketsCreated: { increment: 1 },
        },
      }),
      prisma.marketCreationFee.create({
        data: { userId, marketId: market.id, amount: MARKET_CREATION_FEE },
      }),
    ]);
  } else if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { marketsCreated: { increment: 1 } },
    });
  }
  linkEntitiesToMarket(market.id).catch(() => {});
  computeClustersForMarket(market.id).catch(() => {});
  if (userId) {
    const { recordActivity } = await import("./activity-feed");
    recordActivity(userId, "market_created", { marketId: market.id, canonical: market.canonical }).catch(() => {});
  }

  return { market };
}

export async function getMarketByCanonical(canonical: string) {
  const key = (await resolveCanonical(canonical)) ?? (normalizeForLookup(canonical) || canonical.trim().toLowerCase().replace(/\s+/g, " "));
  return prisma.market.findUnique({
    where: { canonical: key },
    include: {
      positions: {
        where: { shares: { gt: 0 } },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      priceHistory: { orderBy: { timestamp: "asc" }, take: 500 },
    },
  });
}

export async function getMarketById(id: string) {
  return prisma.market.findUnique({
    where: { id },
    include: {
      positions: {
        where: { shares: { gt: 0 } },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      priceHistory: { orderBy: { timestamp: "asc" }, take: 500 },
    },
  });
}

/**
 * Market health: non-zero only if it has met minimum activity (e.g. min initial buy).
 */
export function getMarketHealthScore(market: {
  volume: number;
  tradeCount: number;
  lastTradeAt: Date | null;
}): number {
  if (market.tradeCount === 0) return 0;
  if (market.volume < MIN_INITIAL_BUY_TO_ACTIVATE) return 0;
  let score = Math.log(1 + market.volume) + market.tradeCount * 0.5;
  if (market.lastTradeAt) {
    const hoursSince = (Date.now() - market.lastTradeAt.getTime()) / (60 * 60 * 1000);
    score *= Math.exp(-hoursSince / 48);
  }
  return Math.max(0, score);
}

export async function executeBuy(params: {
  userId: string;
  marketId: string;
  amount: number;
  referrerId?: string | null;
  /** When true, trade is from market-activity simulation; excluded from leaderboards, no referral/copy/activity. */
  isSystemTrade?: boolean;
}) {
  const { userId, marketId, amount, referrerId, isSystemTrade = false } = params;

  const validAmount = validateBuyAmount(amount);
  if (!validAmount.ok) return { error: validAmount.error };

  if (!isSystemTrade && !validateReferrer(referrerId, userId)) {
    return { error: "Invalid referral" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isBanned) return { error: "Unauthorized" };
  if (!canUserTrade(user.waitlistStatus)) return { error: "Trading is invite-only. Join the waitlist or use an invite code." };
  const available = await getAvailableBalance(userId);
  if (available < amount) return { error: "Insufficient balance" };

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { positions: true },
  });
  if (!market) return { error: "Market not found" };
  if (market.status === MARKET_STATUS_ARCHIVED) {
    return { error: "Market is archived and read-only." };
  }
  if (isMarketTradingPaused(market)) {
    return { error: "Trading temporarily paused (circuit breaker). Try again later." };
  }

  let cost: number;
  let shares: number;
  let price: number;
  let newReserveT: number;
  let newReserveS: number;

  if (usePoolAmm(market)) {
    const quote = buyQuote(
      market.reserveTokens,
      market.reserveShares,
      amount
    );
    if (quote.sharesOut <= 0) return { error: "Amount too small for this pool" };
    shares = roundShares(quote.sharesOut);
    if (shares <= 0) return { error: "Amount too small for this pool" };
    cost = amount;
    price = cost / shares;
    newReserveT = quote.newReserveTokens;
    newReserveS = quote.newReserveShares;

    const currentPosition = market.positions.find((p) => p.userId === userId);
    const currentUserShares = currentPosition?.shares ?? 0;
    const totalSupply = totalShares(market);
    const guard = tradeGuardBuy({
      userId,
      marketId,
      currentUserShares,
      totalSupplyFromPositions: totalSupply,
      reserveTokens: market.reserveTokens,
      reserveShares: market.reserveShares,
      requestedAmount: amount,
      sharesOut: shares,
    });
    if (!guard.ok) return { error: guard.error };
    if (guard.cappedShares != null && guard.cappedShares < shares) {
      shares = guard.cappedShares;
      if (shares <= 0) return { error: "Max position size reached" };
      cost = roundMoney(cost * (shares / quote.sharesOut));
      price = cost / shares;
    }
  } else {
    const supply = totalShares(market);
    let rawShares = sharesForBuyAmount(supply, amount);
    if (rawShares <= 0) return { error: "Amount too small" };
    shares = roundShares(rawShares);
    if (shares <= 0) return { error: "Amount too small" };
    cost = costToBuy(supply, shares);
    price = getPriceFromSupply(supply + shares);
    newReserveT = market.reserveTokens;
    newReserveS = market.reserveShares;
  }

  await recordEarlyTrader(marketId, userId);
  const earlyBps = await getEarlyTraderFeeBps(marketId, userId);
  const feeBps = user.isFoundingTrader ? getFoundingTraderFeeBps(true) : earlyBps;
  const fee = Math.floor((cost * feeBps) / 10000);
  let effectiveReferrerId =
    !isSystemTrade && referrerId && validateReferrer(referrerId, userId) ? referrerId : null;
  if (effectiveReferrerId) {
    const abuse = await validateReferralNotAbuse(userId, effectiveReferrerId);
    if (!abuse.ok) effectiveReferrerId = null;
  }
  // Phase 6: 50% platform+referrer, 25% LP, 25% treasury. Referrer gets share of the 50%.
  const lpShare = Math.floor((fee * LP_FEE_BPS) / 100);
  const treasuryShare = Math.floor((fee * TREASURY_FEE_BPS) / 100);
  const platformReferrerPool = fee - lpShare - treasuryShare;
  const feeToReferrer =
    effectiveReferrerId && platformReferrerPool > 0
      ? Math.floor((platformReferrerPool * REFERRER_FEE_BPS) / 10000)
      : 0;
  const totalCost = cost + fee;

  const availableBeforeCost = await getAvailableBalance(userId);
  if (availableBeforeCost < totalCost) {
    return { error: "Insufficient balance for cost + fee" };
  }

  const risk = await runRiskChecks(userId, marketId, "buy", shares, cost);
  if (!risk.ok) return { error: risk.reason };

  const platformFeeShare = platformReferrerPool - feeToReferrer;

  let createdTradeId: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await debitAndLock(userId, totalCost, tx);
      if (!locked.ok) throw new Error("Insufficient balance");
      await updatePositionAfterBuy(tx, { userId, marketId, shares, cost, price });
      const trade = await tx.trade.create({
        data: {
          userId,
          marketId,
          side: "buy",
          shares,
          price,
          total: cost,
          fee,
          feeToReferrer,
          referrerId: effectiveReferrerId,
          isSystemTrade,
        },
      });
      createdTradeId = trade.id;
      const newPhase = phaseForDbAfterTrade(
        market.phase ?? "creation",
        market.volume + cost,
        market.tradeCount + 1
      );
      const circuitTrigger = shouldTriggerCircuitBreaker(market.price, price);
      const marketUpdate: {
        price: number;
        volume: { increment: number };
        tradeCount: { increment: number };
        lastTradeAt: Date;
        phase?: string;
        circuitBreakerUntil?: Date | null;
        reserveTokens?: number;
        reserveShares?: number;
      } = {
        price,
        volume: { increment: cost },
        tradeCount: { increment: 1 },
        lastTradeAt: new Date(),
        phase: newPhase,
        ...(circuitTrigger
          ? {
              circuitBreakerUntil: new Date(
                Date.now() + circuitBreakerCooldownMs()
              ),
            }
          : {}),
      };
      if (usePoolAmm(market)) {
        marketUpdate.reserveTokens = newReserveT;
        marketUpdate.reserveShares = newReserveS;
      }
      const marketVersion = (market as { version?: number }).version ?? 0;
      await tx.market.update({
        where: { id: marketId, version: marketVersion },
        data: { ...marketUpdate, version: marketVersion + 1 },
      });
      await tx.pricePoint.create({
        data: { marketId, price },
      });
      if (effectiveReferrerId && feeToReferrer > 0) {
        await creditBalance(effectiveReferrerId, feeToReferrer, tx);
        await tx.referralEarning.create({
          data: {
            referrerId: effectiveReferrerId,
            tradeId: trade.id,
            amount: feeToReferrer,
          },
        });
      }
    });
    const updatedMarket = await prisma.market.findUnique({
      where: { id: marketId },
      select: { canonical: true, price: true },
    });
    if (updatedMarket) {
      eventBus.publish(CHANNELS.MARKET_PRICE(updatedMarket.canonical), {
        price: updatedMarket.price,
        marketId,
      });
      eventBus.publish(CHANNELS.MARKET_TRADE(updatedMarket.canonical), {
        side: "buy",
        shares,
        price: updatedMarket.price,
        total: cost,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    await prisma.tradeAttempt.create({
      data: {
        userId,
        marketId,
        action: "buy",
        payload: JSON.stringify({ amount }),
        error: msg,
      },
    }).catch(() => {});
    if (msg.includes("negative") || msg.includes("Balance")) {
      return { error: "Insufficient balance. Please retry." };
    }
    return { error: "Trade failed. Please try again." };
  }
  updateMarketMomentum(marketId).catch(() => {});
  distributeFeeToLps(marketId, fee).catch(() => {});
  updateAttentionAfterTrade(marketId, cost).catch(() => {});
  updateMarketReputation(marketId).catch(() => {});
  if (!isSystemTrade) {
    import("./milestone-notifications").then((m) => m.tryMilestoneTradeNotification(userId).catch(() => {})).catch(() => {});
    checkWashTrading(marketId, userId, "buy", cost).catch(() => {});
  }
  if (createdTradeId && fee > 0) {
    recordFeeCollected(fee, createdTradeId).catch(() => {});
    if (feeToReferrer > 0) {
      recordReferralPayout(feeToReferrer, createdTradeId, { marketId }).catch(() => {});
      if (effectiveReferrerId) onReferralTrade(effectiveReferrerId, createdTradeId, feeToReferrer).catch(() => {});
    }
    if (lpShare > 0) recordLpIncentive(lpShare, createdTradeId, { marketId }).catch(() => {});
    if (treasuryShare > 0) recordTreasury(treasuryShare, createdTradeId, { marketId }).catch(() => {});
  }
  checkAndRefundMarketCreationFee(marketId).catch(() => {});
  checkCreatorMilestones(marketId).catch(() => {});
  updateMarketStage(marketId).catch(() => {});
  updateMarketMetrics(marketId).catch(() => {});
  updateMarketSentiment(marketId).catch(() => {});

  if (!isSystemTrade) {
    recordActivity(userId, "trade", { marketId, side: "buy", shares, cost, tradeId: createdTradeId }).catch(() => {});
    mirrorTradeForCopyFollowers({ traderId: userId, marketId, side: "buy", amount: cost, shares }).catch(() => {});
    tryAwardFoundingTrader(userId).catch(() => {});
  }
  if (!isSystemTrade && createdTradeId && platformFeeShare > 0) {
    awardCreatorFeeShare(marketId, platformFeeShare, createdTradeId).catch(() => {});
  }

  const updated = await prisma.market.findUnique({
    where: { id: marketId },
  });
  return {
    success: true,
    tradeId: createdTradeId ?? undefined,
    shares,
    price: updated!.price,
    cost,
    fee,
    totalCost,
  };
}

export async function executeSell(params: {
  userId: string;
  marketId: string;
  shares: number;
  referrerId?: string | null;
  /** When true, trade is from market-activity simulation; excluded from leaderboards, no referral/copy/activity. */
  isSystemTrade?: boolean;
}) {
  const { userId, marketId, shares, referrerId, isSystemTrade = false } = params;

  const validShares = validateSellShares(shares);
  if (!validShares.ok) return { error: validShares.error };

  if (!isSystemTrade && !validateReferrer(referrerId, userId)) {
    return { error: "Invalid referral" };
  }

  const position = await prisma.position.findUnique({
    where: { userId_marketId: { userId, marketId } },
  });
  if (!position || position.shares < shares) {
    return { error: "Insufficient shares" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isBanned) return { error: "Unauthorized" };
  if (!canUserTrade(user.waitlistStatus)) return { error: "Trading is invite-only. Join the waitlist or use an invite code." };

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { positions: true },
  });
  if (!market) return { error: "Market not found" };
  if (market.status === MARKET_STATUS_ARCHIVED) {
    return { error: "Market is archived and read-only." };
  }
  if (isMarketTradingPaused(market)) {
    return { error: "Trading temporarily paused (circuit breaker). Try again later." };
  }

  const sellSharesRounded = roundShares(shares);
  if (sellSharesRounded <= 0 || position.shares < sellSharesRounded) {
    return { error: "Insufficient shares" };
  }
  const guardSell = tradeGuardSell({
    currentUserShares: position.shares,
    sharesToSell: sellSharesRounded,
  });
  if (!guardSell.ok) return { error: guardSell.error };

  let proceeds: number;
  let price: number;
  let newReserveT: number;
  let newReserveS: number;

  if (usePoolAmm(market)) {
    const quote = sellQuote(
      market.reserveTokens,
      market.reserveShares,
      sellSharesRounded
    );
    if (quote.tokensOut <= 0) return { error: "Sell amount too small" };
    proceeds = quote.tokensOut;
    price = proceeds / sellSharesRounded;
    newReserveT = quote.newReserveTokens;
    newReserveS = quote.newReserveShares;
  } else {
    const supply = totalShares(market);
    proceeds = proceedsFromSell(supply, sellSharesRounded);
    price = getPriceFromSupply(Math.max(0, supply - sellSharesRounded));
    newReserveT = market.reserveTokens;
    newReserveS = market.reserveShares;
  }

  await recordEarlyTrader(marketId, userId);
  const earlyBpsSell = await getEarlyTraderFeeBps(marketId, userId);
  const feeBpsSell = user.isFoundingTrader ? getFoundingTraderFeeBps(true) : earlyBpsSell;
  const fee = Math.floor((proceeds * feeBpsSell) / 10000);
  let effectiveReferrerId =
    !isSystemTrade && referrerId && validateReferrer(referrerId, userId) ? referrerId : null;
  if (effectiveReferrerId) {
    const abuse = await validateReferralNotAbuse(userId, effectiveReferrerId);
    if (!abuse.ok) effectiveReferrerId = null;
  }
  const lpShareSell = Math.floor((fee * LP_FEE_BPS) / 100);
  const treasuryShareSell = Math.floor((fee * TREASURY_FEE_BPS) / 100);
  const platformReferrerPoolSell = fee - lpShareSell - treasuryShareSell;
  const feeToReferrer =
    effectiveReferrerId && platformReferrerPoolSell > 0
      ? Math.floor((platformReferrerPoolSell * REFERRER_FEE_BPS) / 10000)
      : 0;
  const netProceeds = proceeds - fee;
  const realized = realizedPnLOnSell(
    sellSharesRounded,
    position.avgPrice,
    netProceeds
  );

  const potentialLoss = realized < 0 ? Math.abs(realized) : undefined;
  const riskSell = await runRiskChecks(
    userId,
    marketId,
    "sell",
    sellSharesRounded,
    proceeds,
    potentialLoss
  );
  if (!riskSell.ok) return { error: riskSell.reason };

  const platformFeeShareSell = platformReferrerPoolSell - feeToReferrer;

  const costBasisReleased = position.avgPrice * sellSharesRounded;
  let createdTradeIdSell: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      await releaseLockAndCredit(userId, costBasisReleased, netProceeds, tx);
      await updatePositionAfterSell(tx, {
        positionId: position.id,
        sharesSold: sellSharesRounded,
        avgCostBasis: position.avgPrice,
        grossProceeds: proceeds,
        netProceeds,
      });
      const trade = await tx.trade.create({
        data: {
          userId,
          marketId,
          side: "sell",
          shares: sellSharesRounded,
          price,
          total: proceeds,
          fee,
          feeToReferrer,
          referrerId: effectiveReferrerId,
          realizedPnLContribution: realized,
          isSystemTrade,
        },
      });
      createdTradeIdSell = trade.id;
      const newPhase = phaseForDbAfterTrade(
        market.phase ?? "creation",
        market.volume + proceeds,
        market.tradeCount + 1
      );
      const circuitTrigger = shouldTriggerCircuitBreaker(market.price, price);
      const marketUpdate: {
        price: number;
        volume: { increment: number };
        tradeCount: { increment: number };
        lastTradeAt: Date;
        phase?: string;
        circuitBreakerUntil?: Date | null;
        reserveTokens?: number;
        reserveShares?: number;
      } = {
        price,
        volume: { increment: proceeds },
        tradeCount: { increment: 1 },
        lastTradeAt: new Date(),
        phase: newPhase,
        ...(circuitTrigger
          ? {
              circuitBreakerUntil: new Date(
                Date.now() + circuitBreakerCooldownMs()
              ),
            }
          : {}),
      };
      if (usePoolAmm(market)) {
        marketUpdate.reserveTokens = newReserveT;
        marketUpdate.reserveShares = newReserveS;
      }
      const sellMarketVersion = (market as { version?: number }).version ?? 0;
      await tx.market.update({
        where: { id: marketId, version: sellMarketVersion },
        data: { ...marketUpdate, version: sellMarketVersion + 1 },
      });
      await tx.pricePoint.create({
        data: { marketId, price },
      });
      if (effectiveReferrerId && feeToReferrer > 0) {
        await creditBalance(effectiveReferrerId, feeToReferrer, tx);
        await tx.referralEarning.create({
          data: {
            referrerId: effectiveReferrerId,
            tradeId: trade.id,
            amount: feeToReferrer,
          },
        });
      }
    });
    const updatedMarket = await prisma.market.findUnique({
      where: { id: marketId },
      select: { canonical: true, price: true },
    });
    if (updatedMarket) {
      eventBus.publish(CHANNELS.MARKET_PRICE(updatedMarket.canonical), {
        price: updatedMarket.price,
        marketId,
      });
      eventBus.publish(CHANNELS.MARKET_TRADE(updatedMarket.canonical), {
        side: "sell",
        shares: sellSharesRounded,
        price: updatedMarket.price,
        total: proceeds,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    await prisma.tradeAttempt.create({
      data: {
        userId,
        marketId,
        action: "sell",
        payload: JSON.stringify({ shares: sellSharesRounded }),
        error: msg,
      },
    }).catch(() => {});
    if (msg.includes("negative") || msg.includes("Balance")) {
      return { error: "Insufficient balance. Please retry." };
    }
    return { error: "Trade failed. Please try again." };
  }
  updateMarketMomentum(marketId).catch(() => {});
  distributeFeeToLps(marketId, fee).catch(() => {});
  updateAttentionAfterTrade(marketId, proceeds).catch(() => {});
  updateMarketReputation(marketId).catch(() => {});
  if (!isSystemTrade) {
    tryAwardFoundingTrader(userId).catch(() => {});
    import("./milestone-notifications").then((m) => m.tryMilestoneTradeNotification(userId).catch(() => {})).catch(() => {});
    checkWashTrading(marketId, userId, "sell", proceeds).catch(() => {});
    checkPriceSpike(marketId, price).catch(() => {});
    if (usePoolAmm(market)) {
      checkLargeDrain(marketId, userId, proceeds, market.reserveTokens).catch(() => {});
    }
    if (realized !== 0) {
      updateReputationAfterTrade(userId, realized, realized > 0).catch(() => {});
      evaluateBadges(userId).catch(() => {});
    }
  }
  if (createdTradeIdSell && fee > 0) {
    recordFeeCollected(fee, createdTradeIdSell).catch(() => {});
    if (feeToReferrer > 0) {
      recordReferralPayout(feeToReferrer, createdTradeIdSell, { marketId }).catch(() => {});
      if (effectiveReferrerId) onReferralTrade(effectiveReferrerId, createdTradeIdSell, feeToReferrer).catch(() => {});
    }
    if (lpShareSell > 0) recordLpIncentive(lpShareSell, createdTradeIdSell, { marketId }).catch(() => {});
    if (treasuryShareSell > 0) recordTreasury(treasuryShareSell, createdTradeIdSell, { marketId }).catch(() => {});
  }
  checkAndRefundMarketCreationFee(marketId).catch(() => {});
  if (!isSystemTrade && createdTradeIdSell && platformFeeShareSell > 0) {
    awardCreatorFeeShare(marketId, platformFeeShareSell, createdTradeIdSell).catch(() => {});
  }
  checkCreatorMilestones(marketId).catch(() => {});
  updateMarketStage(marketId).catch(() => {});
  updateMarketMetrics(marketId).catch(() => {});
  updateMarketSentiment(marketId).catch(() => {});

  if (!isSystemTrade) {
    recordActivity(userId, "trade", { marketId, side: "sell", shares: sellSharesRounded, proceeds, tradeId: createdTradeIdSell }).catch(() => {});
    mirrorTradeForCopyFollowers({ traderId: userId, marketId, side: "sell", amount: proceeds, shares: sellSharesRounded }).catch(() => {});
  }

  const updated = await prisma.market.findUnique({
    where: { id: marketId },
  });
  return {
    success: true,
    tradeId: createdTradeIdSell ?? undefined,
    shares: sellSharesRounded,
    price: updated!.price,
    proceeds,
    fee,
    netProceeds,
    realizedPnL: realized,
  };
}
