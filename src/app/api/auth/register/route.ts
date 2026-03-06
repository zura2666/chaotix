import { NextRequest, NextResponse } from "next/server";
import { createUser, applySessionToResponse } from "@/lib/auth";
import { parseBody, registerBodySchema } from "@/lib/api-schemas";
import { assertCsrf } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(registerBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, password, name, username, referralCode } = parsed.data;
    const result = await createUser({
      email,
      password,
      name: name ?? undefined,
      username,
      referralCode: referralCode ?? undefined,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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
