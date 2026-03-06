/**
 * Public API: Narrative Intelligence Layer.
 * GET /api/index/narratives
 *
 * Returns:
 * - globalNarrativeIndex (0–100): volume-weighted narrative strength across active markets
 * - topRisingNarratives: clusters sorted by positive 24h momentum (cluster average priceChange24h)
 * - topCollapsingNarratives: clusters sorted by negative 24h momentum
 * - indexes: cluster-based indexes (clusterIndex = average(narrativeStrength) of cluster markets), 0–100
 *   - aiNarrativeIndex (artificial-intelligence)
 *   - cryptoNarrativeIndex (crypto)
 *   - geopoliticsIndex (geopolitics)
 *   - technologyIndex (technology)
 */

import { NextResponse } from "next/server";
import { getNarrativeIndex, maybeRecordIndexSnapshot } from "@/lib/narrative-index";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getNarrativeIndex();
  maybeRecordIndexSnapshot(data).catch(() => {});
  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return response;
}
