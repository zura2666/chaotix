import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { getAdvancedAnalytics } from "@/lib/analytics";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const data = await getAdvancedAnalytics();
  return NextResponse.json(data);
}
