import Link from "next/link";
import { getNarrativeIndex } from "@/lib/narrative-index";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export const metadata = {
  title: "Narrative Intelligence Dashboard · Analytics · Chaotix",
  description: "Global Narrative Index, top rising and collapsing narratives, AI / Crypto / Geopolitics / Technology indexes with charts.",
};

export default async function AnalyticsPage() {
  const data = await getNarrativeIndex();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Home
      </Link>
      <AnalyticsDashboard initialData={data} />
    </div>
  );
}
