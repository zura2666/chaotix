/**
 * Server-Sent Events for real-time updates.
 * Streams: market price/trades, trending snapshot, leaderboard snapshot.
 * Clients subscribe with ?stream=market:canonical or ?stream=trending or ?stream=global
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getTrendingMarkets } from "@/lib/trending";
import { getTopTraders } from "@/lib/leaderboard";
import { computeLiquidityHealth } from "@/lib/liquidity-health";
import { resolveCanonical } from "@/lib/canonicalization";
import { normalizeForLookup } from "@/lib/identifiers";
import { eventBus, CHANNELS } from "@/lib/event-bus";

const CACHE_TTL_MS = 3000;
const cache = new Map<string, { data: string; ts: number }>();

function getCached(key: string, fetcher: () => Promise<string>): Promise<string> {
  const ent = cache.get(key);
  if (ent && Date.now() - ent.ts < CACHE_TTL_MS) return Promise.resolve(ent.data);
  return fetcher().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stream = searchParams.get("stream") ?? "global";

  const encoder = new TextEncoder();
  const streamId = `events-${Date.now()}`;

  const body = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      const sendHeartbeat = () => {
        send("ping", JSON.stringify({ t: Date.now() }));
      };

      if (stream.startsWith("market:")) {
        const input = stream.slice(7).trim();
        const canonical = (await resolveCanonical(input)) ?? (normalizeForLookup(input) || input.toLowerCase());
        let lastPrice = 0;
        let lastTradeId = "";
        const unsubPrice = eventBus.subscribe(CHANNELS.MARKET_PRICE(canonical), (payload) => {
          try {
            send("price", JSON.stringify(payload));
          } catch {}
        });
        const unsubTrade = eventBus.subscribe(CHANNELS.MARKET_TRADE(canonical), (payload) => {
          try {
            send("trade", JSON.stringify(payload));
          } catch {}
        });
        const interval = setInterval(async () => {
          try {
            const market = await prisma.market.findUnique({
              where: { canonical },
              include: {
                positions: { select: { shares: true, userId: true } },
                trades: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { id: true, price: true, side: true, total: true, createdAt: true },
                },
              },
            });
            if (!market) {
              send("error", JSON.stringify({ message: "Market not found" }));
              return;
            }
            if (market.price !== lastPrice) {
              lastPrice = market.price;
              const health = computeLiquidityHealth({
                reserveTokens: market.reserveTokens,
                reserveShares: market.reserveShares,
                price: market.price,
                volume: market.volume,
                tradeCount: market.tradeCount,
                positions: market.positions,
              });
              send(
                "price",
                JSON.stringify({
                  canonical: market.canonical,
                  price: market.price,
                  volume: market.volume,
                  tradeCount: market.tradeCount,
                  health: health.status,
                })
              );
            }
            const last = market.trades[0];
            if (last && last.id !== lastTradeId) {
              lastTradeId = last.id;
              send(
                "trade",
                JSON.stringify({
                  id: last.id,
                  marketId: market.id,
                  canonical: market.canonical,
                  side: last.side,
                  price: last.price,
                  total: last.total,
                  createdAt: last.createdAt.toISOString(),
                })
              );
            }
          } catch (e) {
            send("error", JSON.stringify({ message: "Server error" }));
          }
        }, 2000);
        sendHeartbeat();
        const heartbeat = setInterval(sendHeartbeat, 25000);
        req.signal?.addEventListener?.("abort", () => {
          unsubPrice();
          unsubTrade();
          clearInterval(interval);
          clearInterval(heartbeat);
        });
        return;
      }

      if (stream === "trending" || stream === "global") {
        const interval = setInterval(async () => {
          try {
            const trending = await getCached("trending", async () => {
              const t = await getTrendingMarkets(10);
              return JSON.stringify(
                t.map((m) => ({
                  id: m.id,
                  canonical: m.canonical,
                  displayName: m.displayName,
                  price: m.price,
                  volume: m.volume,
                  tradeCount: m.tradeCount,
                }))
              );
            });
            const traders = await getCached("traders", async () => {
              const t = await getTopTraders(10);
              return JSON.stringify(
                t.map((x) => ({
                  userId: x.user?.id,
                  volume: x.volume,
                  tradeCount: x.tradeCount,
                }))
              );
            });
            send("trending", trending);
            send("leaderboard", traders);
          } catch {
            send("error", JSON.stringify({ message: "Server error" }));
          }
        }, 5000);
        sendHeartbeat();
        const heartbeat = setInterval(sendHeartbeat, 25000);
        req.signal?.addEventListener?.("abort", () => {
          clearInterval(interval);
          clearInterval(heartbeat);
        });
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
