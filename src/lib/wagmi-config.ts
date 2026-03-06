import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import type { Config } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

/** Only create config when projectId is set so the app can run without WalletConnect. */
export const hasWalletSupport = Boolean(projectId);

export const wagmiConfig: Config | null = hasWalletSupport
  ? getDefaultConfig({
      appName: "Chaotix",
      projectId: projectId!,
      chains: [mainnet],
      ssr: true,
    })
  : null;
