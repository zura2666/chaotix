"use client";

import { createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { SessionProvider } from "./SessionProvider";
import { wagmiConfig, hasWalletSupport } from "@/lib/wagmi-config";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const WalletSupportContext = createContext(false);

export function useWalletSupport() {
  return useContext(WalletSupportContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {wagmiConfig ? (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <WalletSupportContext.Provider value={true}>
                {children}
              </WalletSupportContext.Provider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      ) : (
        <QueryClientProvider client={queryClient}>
          <WalletSupportContext.Provider value={false}>
            {children}
          </WalletSupportContext.Provider>
        </QueryClientProvider>
      )}
    </SessionProvider>
  );
}
