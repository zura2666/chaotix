import { getNarrativeIndex } from "@/lib/narrative-index";
import { NarrativeIndexView } from "./NarrativeIndexView";

export const metadata = {
  title: "Narrative Intelligence · Chaotix",
  description: "Global Narrative Index, rising and collapsing narratives, AI / War Risk / Crypto indexes.",
};

export default async function NarrativeIndexPage() {
  const data = await getNarrativeIndex();
  return <NarrativeIndexView data={data} />;
}
