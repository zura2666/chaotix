/**
 * Redis Pub/Sub event bus adapter for production scale.
 * Use when EVENT_BUS_PROVIDER=redis. Requires ioredis when redis is enabled.
 */

type Listener = (payload: unknown) => void;

export interface IEventBus {
  publish(channel: string, payload: unknown): void;
  subscribe(channel: string, listener: Listener): () => void;
  _getChannelListeners?(channel: string): number;
}

const listenersByChannel = new Map<string, Set<Listener>>();

function getRedisClient(): { publish: (ch: string, msg: string) => Promise<void>; subscribe: (ch: string, cb: (msg: string) => void) => void } | null {
  const prov = process.env.EVENT_BUS_PROVIDER;
  if (prov !== "redis" && prov !== "1") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require("ioredis") as new (url: string) => { publish: (ch: string, msg: string) => Promise<void>; subscribe: (ch: string) => void; on: (ev: string, cb: (ch: string, msg: string) => void) => void };
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const pub = new Redis(url);
    const sub = new Redis(url);
    return {
      publish: (ch: string, msg: string) => pub.publish(ch, msg),
      subscribe: (ch: string, cb: (msg: string) => void) => {
        sub.subscribe(ch);
        sub.on("message", (c: string, m: string) => {
          if (c === ch) cb(m);
        });
      },
    };
  } catch {
    return null;
  }
}

let redis: ReturnType<typeof getRedisClient> | undefined;

function getRedis(): ReturnType<typeof getRedisClient> {
  if (redis === undefined) redis = getRedisClient();
  return redis;
}

/**
 * Redis-backed event bus. Uses pub/sub; local listeners invoked when message received.
 */
export function createRedisEventBus(): IEventBus {
  const client = getRedis();
  if (!client) {
    throw new Error("Redis not available. Set EVENT_BUS_PROVIDER=redis and install ioredis.");
  }
  const subscribedChannels = new Set<string>();
  function ensureSubscribed(channel: string) {
    if (subscribedChannels.has(channel)) return;
    subscribedChannels.add(channel);
    client!.subscribe(channel, (msg: string) => {
      try {
        const payload = JSON.parse(msg) as unknown;
        const set = listenersByChannel.get(channel);
        if (set) set.forEach((fn) => { try { fn(payload); } catch (e) { console.error("EventBus listener error", e); } });
      } catch {
        // ignore parse error
      }
    });
  }
  return {
    publish(channel: string, payload: unknown): void {
      const msg = JSON.stringify(payload);
      client!.publish(channel, msg).catch((e) => console.error("Redis publish error", e));
    },
    subscribe(channel: string, listener: Listener): () => void {
      ensureSubscribed(channel);
      if (!listenersByChannel.has(channel)) listenersByChannel.set(channel, new Set());
      listenersByChannel.get(channel)!.add(listener);
      return () => {
        listenersByChannel.get(channel)?.delete(listener);
      };
    },
    _getChannelListeners(channel: string): number {
      return listenersByChannel.get(channel)?.size ?? 0;
    },
  };
}
