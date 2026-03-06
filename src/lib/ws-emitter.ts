import { EventEmitter } from "events";

declare global {
    var wsEmitter: EventEmitter | undefined;
}

// Reuse the global emitter initialized in server.js to maintain the exact same instance across hot reloads in Next.js development (or instantiate a fallback if needed).
const emitter = global.wsEmitter || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
    global.wsEmitter = emitter;
}

export const wsEmitter = emitter;

export function emitTradeExecuted(assetId: string, trade: any) {
    wsEmitter.emit("tradeExecuted", { assetId, trade });
}

export function emitOrderBookUpdated(assetId: string, orderBook: any) {
    wsEmitter.emit("orderBookUpdated", { assetId, orderBook });
}

export function emitPriceUpdated(assetId: string, price: number, timestamp: Date | string) {
    wsEmitter.emit("priceUpdated", { assetId, price, timestamp });
}
