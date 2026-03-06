"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/SocketProvider";

type MarketWSData = {
    orderBook?: any;
    recentTrades: any[];
    priceHistoryFeed: any[];
};

export function useMarketSocket(assetId: string) {
    const { socket, isConnected } = useSocket();
    const [liveOrderBook, setLiveOrderBook] = useState<any>(null);
    const [newTrades, setNewTrades] = useState<any[]>([]);
    const [livePricePoint, setLivePricePoint] = useState<{ price: number; timestamp: string } | null>(null);

    useEffect(() => {
        if (!socket || !isConnected || !assetId) return;

        socket.emit("join-market", assetId);

        const onOrderBookUpdated = (orderBook: any) => {
            setLiveOrderBook(orderBook);
        };

        const onTradeExecuted = (trade: any) => {
            setNewTrades((prev) => [trade, ...prev].slice(0, 50));
        };

        const onPriceUpdated = (data: { price: number; timestamp: string }) => {
            setLivePricePoint(data);
        };

        socket.on("orderBookUpdated", onOrderBookUpdated);
        socket.on("tradeExecuted", onTradeExecuted);
        socket.on("priceUpdated", onPriceUpdated);

        return () => {
            socket.emit("leave-market", assetId);
            socket.off("orderBookUpdated", onOrderBookUpdated);
            socket.off("tradeExecuted", onTradeExecuted);
            socket.off("priceUpdated", onPriceUpdated);
        };
    }, [socket, isConnected, assetId]);

    return { liveOrderBook, newTrades, livePricePoint, isConnected };
}
