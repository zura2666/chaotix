import { Ghost } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

type Props = {
  title: string;
  description?: string;
  ctaLabel?: string;
  /** Link for the CTA (default: create page; use /profile for profile Create Market section) */
  ctaHref?: string;
};

export function EmptyState({
  title,
  description,
  ctaLabel = "Be the first to create a market",
  ctaHref = "/create",
}: Props) {
  return (
    <ChaotixCard as="div" className="col-span-full min-h-[200px]">
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-500">
          <Ghost className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </div>
        <h3 className="mt-6 font-semibold text-slate-100">{title}</h3>
        {description && (
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>
        )}
        <ChaotixButton href={ctaHref} variant="primary" className="mt-6">
          {ctaLabel}
        </ChaotixButton>
      </div>
    </ChaotixCard>
  );
}
