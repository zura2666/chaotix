import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordExternalMention } from "@/lib/marketplace-demand";

/** Record external mention (e.g. admin or webhook). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: assetId } = await params;
  let body: { source?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  await recordExternalMention(assetId, body.source);
  return NextResponse.json({ ok: true });
}
