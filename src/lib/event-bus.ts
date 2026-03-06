/**
 * Event bus abstraction for real-time and scaling.
 * Switch via env: EVENT_BUS_PROVIDER=memory|redis (default: memory).
 */

type Listener = (payload: unknown) => void;
const channels = new Map<string, Set<Listener>>();

const memoryBus = {
  publish(channel: string, payload: unknown): void {
    const listeners = channels.get(channel);
    if (!listeners) return;
    listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error("EventBus listener error", e);
      }
    });
  },
  subscribe(channel: string, listener: Listener): () => void {
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel)!.add(listener);
    return () => {
      channels.get(channel)?.delete(listener);
    };
  },
  _getChannelListeners(channel: string): number {
    return channels.get(channel)?.size ?? 0;
  },
};

function loadEventBus(): typeof memoryBus {
  const provider = process.env.EVENT_BUS_PROVIDER ?? "memory";
  if (provider === "redis" || provider === "1") {
    try {
      const { createRedisEventBus } = require("./redis-event-bus");
      return createRedisEventBus() as typeof memoryBus;
    } catch {
      console.warn("Redis event bus unavailable, using memory.");
    }
  }
  return memoryBus;
}

export const eventBus = loadEventBus();

/** Channel names. */
export const CHANNELS = {
  MARKET_PRICE: (canonical: string) => `market:${canonical}:price`,
  MARKET_TRADE: (canonical: string) => `market:${canonical}:trade`,
  TRENDING: "trending",
  LEADERBOARD: "leaderboard",
  SYSTEM: "system",
} as const;
