import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getNotificationsForUser,
  getUnreadCount,
} from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(user.id, { limit, unreadOnly }),
    getUnreadCount(user.id),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}
