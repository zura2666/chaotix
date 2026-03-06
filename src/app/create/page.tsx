import { redirect } from "next/navigation";
import { CreateMarketForm } from "./CreateMarketForm";
import { getSession } from "@/lib/auth";
import { CURATED_NARRATIVE_MODE } from "@/lib/constants";

type Props = { searchParams: Promise<{ string?: string }> };

export default async function CreateMarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialString = params.string?.trim() ?? "";

  if (CURATED_NARRATIVE_MODE) {
    const user = await getSession();
    if (!user?.isAdmin) redirect("/");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-white">Create Market</h1>
      <p className="mb-8 text-sm text-slate-500">
        {CURATED_NARRATIVE_MODE
          ? "Admins can add new curated narrative markets. Core markets and high-volume markets appear in discovery."
          : "Confirm the canonical string and add an optional title and description. If you don't have enough reputation to create directly, "}
        {!CURATED_NARRATIVE_MODE && (
          <a href="/governance/proposals" className="underline text-amber-400 hover:text-amber-300">propose a market</a>
        )}
        {!CURATED_NARRATIVE_MODE && " for community upvotes."}
      </p>
      <CreateMarketForm initialString={initialString} />
    </div>
  );
}
