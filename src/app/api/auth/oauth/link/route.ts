import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyOAuthToken } from "@/lib/oauth-providers";
import { linkOAuthToUser } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { checkRateLimitAsync } from "@/lib/rate-limit";

const OAUTH_LINK_RATE_LIMIT = 10;
const OAUTH_LINK_WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to link an account." }, { status: 401 });
  }

  const ok = await checkRateLimitAsync(`oauth-link:${session.id}`, OAUTH_LINK_RATE_LIMIT, OAUTH_LINK_WINDOW_MS);
  if (!ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider ?? "").toLowerCase();
    const accessToken = typeof body.access_token === "string" ? body.access_token.trim() : body.accessToken?.trim();

    if (!accessToken || (provider !== "google" && provider !== "facebook")) {
      return NextResponse.json(
        { error: "Provide provider (google|facebook) and access_token." },
        { status: 400 }
      );
    }

    const info = await verifyOAuthToken(provider, accessToken);
    if (!info || !info.id) {
      return NextResponse.json({ error: "Invalid or expired token. Try again." }, { status: 401 });
    }

    const result = await linkOAuthToUser(
      session.id,
      provider,
      info.id,
      info.email ?? null,
      info.picture ?? null
    );
    if (result && "error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      provider,
      message: `${provider === "google" ? "Google" : "Facebook"} account linked.`,
    });
  } catch (e) {
    console.error("[oauth/link]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
