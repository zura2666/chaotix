import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthToken } from "@/lib/oauth-providers";
import { findUserByOAuth, createUserFromOAuth, setSession } from "@/lib/auth";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

const OAUTH_RATE_LIMIT = 20;
const OAUTH_WINDOW_MS = 60 * 1000;

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  return ip;
}

export async function POST(req: NextRequest) {
  const clientId = getClientId(req);
  const ok = await checkRateLimitAsync(`oauth:${clientId}`, OAUTH_RATE_LIMIT, OAUTH_WINDOW_MS);
  if (!ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider ?? "").toLowerCase();
    const accessToken = typeof body.access_token === "string" ? body.access_token.trim() : body.accessToken?.trim();

    if (!accessToken || (provider !== "google" && provider !== "facebook")) {
      await auditLog({ action: "oauth_login_failed", details: "invalid_request", ip: clientId });
      return NextResponse.json(
        { error: "Invalid request. Provide provider (google|facebook) and access_token." },
        { status: 400 }
      );
    }

    const info = await verifyOAuthToken(provider, accessToken);
    if (!info || !info.id) {
      await auditLog({ action: "oauth_login_failed", details: "invalid_token", resource: provider, ip: clientId });
      return NextResponse.json({ error: "Invalid or expired token. Try signing in again." }, { status: 401 });
    }

    const existingByOAuth = await findUserByOAuth(provider, info.id);
    if (existingByOAuth) {
      if (existingByOAuth.isBanned) {
        return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
      }
      await setSession(existingByOAuth.id);
      return NextResponse.json({
        user: {
          id: existingByOAuth.id,
          email: existingByOAuth.email,
          name: existingByOAuth.name,
          username: existingByOAuth.username ?? null,
          referralCode: existingByOAuth.referralCode,
          balance: existingByOAuth.balance,
          isAdmin: existingByOAuth.isAdmin,
          oauthProvider: existingByOAuth.oauth_provider ?? undefined,
        },
      });
    }

    const email = info.email?.trim() || null;
    if (email) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true, oauth_provider: true, passwordHash: true },
      });
      if (existingByEmail) {
        return NextResponse.json({
          needsLink: true,
          email,
          message: "An account with this email already exists. Log in with your password, then link this account in settings.",
        }, { status: 200 });
      }
    }

    const { user } = await createUserFromOAuth({
      provider,
      oauthId: info.id,
      oauthEmail: info.email ?? null,
      oauthPicture: info.picture ?? null,
      name: info.name ?? null,
    });
    await setSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username ?? null,
        referralCode: user.referralCode,
        balance: user.balance,
        isAdmin: user.isAdmin,
        oauthProvider: user.oauth_provider ?? undefined,
      },
    });
  } catch (e) {
    console.error("[oauth/login]", e);
    await auditLog({ action: "oauth_login_failed", details: String(e), ip: clientId });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
