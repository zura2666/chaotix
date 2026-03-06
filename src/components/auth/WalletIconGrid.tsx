"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

/** Polymarket-style grid: MetaMask, Coinbase, Phantom, WalletConnect. Each opens RainbowKit. */
export function WalletIconGrid({ onConnect }: { onConnect: () => void }) {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: "metamask", name: "MetaMask", Icon: MetaMaskIcon },
            { id: "coinbase", name: "Coinbase Wallet", Icon: CoinbaseIcon },
            { id: "phantom", name: "Phantom", Icon: PhantomIcon },
            { id: "walletconnect", name: "WalletConnect", Icon: WalletConnectIcon },
          ].map(({ id, name, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onConnect();
                openConnectModal?.();
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/50 py-4 transition hover:border-emerald-500/40 hover:bg-slate-900/60"
              aria-label={`Connect with ${name}`}
            >
              <Icon className="h-8 w-8 shrink-0" />
              <span className="text-[10px] font-medium text-slate-500">{name}</span>
            </button>
          ))}
        </div>
      )}
    </ConnectButton.Custom>
  );
}

function MetaMaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        fill="#E8831D"
        d="M36.017 4.5L22.5 13.65l2.433-5.82L36.017 4.5zM4.167 4.5l13.35 9.15-2.317-5.82L4.167 4.5zm31.666 27l-4.8-7.35 4.05 1.85.75-5.2-28.05-10.35 10.35 28.05-5.2-.75-1.85-4.05-7.35 4.8 12.9 9.9 12.9-9.9zM20 23.433l-4.05-4.05 8.1-11.7 4.05 15.75H20z"
      />
    </svg>
  );
}

function CoinbaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#0052FF" />
      <path
        fill="#fff"
        d="M20 12c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12.8c-2.65 0-4.8-2.15-4.8-4.8s2.15-4.8 4.8-4.8 4.8 2.15 4.8 4.8-2.15 4.8-4.8 4.8z"
      />
    </svg>
  );
}

function PhantomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        fill="#AB9FF2"
        d="M32 8H8a4 4 0 00-4 4v16a4 4 0 004 4h24a4 4 0 004-4V12a4 4 0 00-4-4zM20 28a4 4 0 110-8 4 4 0 010 8z"
      />
    </svg>
  );
}

function WalletConnectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        fill="#3B99FC"
        d="M8.5 14.2c4.4-4.3 11.6-4.3 16 0l.5.5c.2.2.2.5 0 .7l-1.8 1.8c-.1.1-.3.1-.4 0l-.7-.7c-3.1-3-8.1-3-11.2 0l-.7.7c-.1.1-.3.1-.4 0L8 15.4c-.2-.2-.2-.5 0-.7l.5-.5zm20.2 0l.5.5c.2.2.2.5 0 .7l-1.8 1.8c-.1.1-.3.1-.4 0l-.7-.7c-3.1-3-8.1-3-11.2 0l-.7.7c-.1.1-.3.1-.4 0L20.2 15.4c-.2-.2-.2-.5 0-.7l.5-.5c4.4-4.3 11.6-4.3 16 0zM4.2 21.8c.2-.2.5-.2.7 0l5.4 5.4c.2.2.2.5 0 .7l-1.5 1.5c-.2.2-.5.2-.7 0l-5.4-5.4c-.2-.2-.2-.5 0-.7l1.5-1.5zm26.4 0l1.5 1.5c.2.2.2.5 0 .7l-5.4 5.4c-.2.2-.5.2-.7 0l-1.5-1.5c-.2-.2-.2-.5 0-.7l5.4-5.4c.2-.2.5-.2.7 0z"
      />
    </svg>
  );
}
