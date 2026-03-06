import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordAssetView } from "@/lib/marketplace-demand";

/** Record a page view (e.g. client-side ping for SPA nav). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params;
  const user = await getSession();
  await recordAssetView(assetId, user?.id).catch(() => {});
  return NextResponse.json({ ok: true });
}
