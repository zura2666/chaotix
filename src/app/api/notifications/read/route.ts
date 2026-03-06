import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markAsRead, markAllAsRead } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { ids, all } = body as { ids?: string[]; all?: boolean };
    if (all === true) {
      const count = await markAllAsRead(user.id);
      return NextResponse.json({ ok: true, marked: count });
    }
    const idList = Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    const marked = await markAsRead(idList, user.id);
    return NextResponse.json({ ok: true, marked });
  } catch (e) {
    console.error("Notifications read error", e);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
