import { NextRequest, NextResponse } from "next/server";
import { loginUser, applySessionToResponse } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailOrUsername = body.email ?? body.username ?? body.email_or_username;
    const password = body.password;
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Email or username and password required" },
        { status: 400 }
      );
    }
    const result = await loginUser(String(emailOrUsername).trim(), password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: (result.user as { username?: string | null }).username ?? null,
        referralCode: result.user.referralCode,
        balance: result.user.balance,
        isAdmin: (result.user as { isAdmin?: boolean }).isAdmin,
      },
    });
    return applySessionToResponse(response, result.user.id);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
