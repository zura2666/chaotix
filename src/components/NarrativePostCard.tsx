"use client";

/**
 * Single narrative feed post. When the post references a trade (tradeReferenceId/tradeId),
 * shows a trade card inside the post, then the content as commentary/reason.
 */

type TradeRef = {
  id: string;
  side: string;
  shares: number;
  price: number;
  createdAt: string;
};

type Props = {
  content: string;
  userName: string | null;
  createdAt: string;
  likes: number;
  trade: TradeRef | null;
  /** When true, show content as "Reason: …" below the trade card. */
  showContentAsReason?: boolean;
};

export function NarrativePostCard({
  content,
  userName,
  createdAt,
  likes,
  trade,
  showContentAsReason = true,
}: Props) {
  const displayName = userName || "Trader";

  return (
    <div className="border-b border-white/5 px-2 py-2.5 last:border-b-0">
      <p className="text-xs font-medium text-slate-400">{displayName}</p>

      {trade && (
        <div
          className="mt-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2"
          aria-label="Referenced trade"
        >
          <p
            className={`text-sm font-medium ${
              trade.side === "buy" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trade.side === "buy" ? "Bought" : "Sold"}{" "}
            <span className="font-mono text-slate-100">
              {trade.shares.toFixed(2)} shares
            </span>{" "}
            at{" "}
            <span className="font-mono text-slate-100">
              {trade.price.toFixed(2)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {new Date(trade.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}

      {content && (
        <p className="mt-2 text-sm text-slate-200">
          {showContentAsReason && trade ? (
            <>
              <span className="text-slate-500">Reason: </span>
              {content}
            </>
          ) : (
            content
          )}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
        {likes > 0 && (
          <span>
            {likes} like{likes !== 1 ? "s" : ""}
          </span>
        )}
        <span>
          {new Date(createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
