import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAsset } from "@/lib/marketplace";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: {
    title?: string;
    category?: string;
    description?: string | null;
    supplyModel?: string;
    maxSupply?: number | null;
    metadata?: string | null;
    initialSupply?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const supplyModel = (body.supplyModel as "fixed" | "limited" | "unlimited") ?? "unlimited";
  const result = await createAsset(user.id, {
    title: body.title ?? "",
    category: body.category ?? "other",
    description: body.description ?? null,
    supplyModel,
    maxSupply: body.maxSupply ?? null,
    metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    initialSupply: body.initialSupply,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id });
}
