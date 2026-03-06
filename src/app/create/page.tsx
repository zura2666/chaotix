import { CreateMarketForm } from "./CreateMarketForm";

type Props = { searchParams: Promise<{ string?: string }> };

export default async function CreateMarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialString = params.string?.trim() ?? "";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-white">Create Market</h1>
      <p className="mb-8 text-sm text-slate-500">
        Confirm the canonical string and add an optional title and description. Only logged-in users can create markets.
      </p>
      <CreateMarketForm initialString={initialString} />
    </div>
  );
}
