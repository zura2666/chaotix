import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { validateIdentifierSafe, normalizeIdentifier, MIN_IDENTIFIER_LENGTH } from "./identifiers";

const SESSION_COOKIE = "chaotix_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  referralCode: string;
  referralStatus: string;
  partnerShortSlug: string | null;
  balance: number;
  isBanned: boolean;
  isAdmin: boolean;
  waitlistStatus: string | null;
  inviteCodeUsed: string | null;
  isFoundingTrader: boolean;
  oauthProvider: string | null;
  oauthPicture: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      referralCode: true,
      balance: true,
      isBanned: true,
      isAdmin: true,
      waitlistStatus: true,
      inviteCodeUsed: true,
      isFoundingTrader: true,
      oauth_provider: true,
      oauth_picture: true,
      // After running `npx prisma generate` (stop dev server first on Windows), add: referralStatus: true, partnerShortSlug: true, and use rest.referralStatus ?? "NONE", rest.partnerShortSlug ?? null below.
    },
  });
  if (user?.isBanned) return null;
  if (!user) return null;
  const { oauth_provider, oauth_picture, ...rest } = user;
  return {
    ...rest,
    referralStatus: "NONE",
    partnerShortSlug: null,
    oauthProvider: oauth_provider ?? null,
    oauthPicture: oauth_picture ?? null,
  } as SessionUser;
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

export async function setSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, SESSION_COOKIE_OPTIONS);
}

/** Apply session cookie to a NextResponse so it is sent to the client (fixes cookie not persisting after login). */
export function applySessionToResponse(response: NextResponse, userId: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, userId, SESSION_COOKIE_OPTIONS);
  return response;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createUser(params: {
  email: string;
  password: string;
  name?: string;
  username: string;
  referralCode?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  });
  if (existing) return { error: "Email already registered" };

  const v = validateIdentifierSafe(String(params.username).trim());
  if (!v.ok) return { error: v.error };
  const existingUsername = await prisma.user.findUnique({
    where: { username: v.value },
  });
  if (existingUsername) return { error: "Username already taken" };
  const username = v.value;

  let referredById: string | null = null;
  if (params.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: params.referralCode.toUpperCase() },
    });
    if (referrer && referrer.id) referredById = referrer.id;
  }

  let code = generateReferralCode();
  while (await prisma.user.findUnique({ where: { referralCode: code } })) {
    code = generateReferralCode();
  }

  const hash = await hashPassword(params.password);
  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash: hash,
      name: params.name ?? null,
      username,
      referralCode: code,
      referredById,
      balance: 1000,
    },
  });
  return { user };
}

/**
 * Login by email or username. identifier can be an email or a username (alphanumeric + _ -).
 */
export async function loginUser(identifier: string, password: string) {
  const raw = String(identifier).trim();
  const isEmail = raw.includes("@");
  let user: { id: string; email: string | null; name: string | null; username: string | null; referralCode: string; balance: number; passwordHash: string | null; isAdmin: boolean } | null = null;
  if (isEmail) {
    user = await prisma.user.findUnique({
      where: { email: raw.toLowerCase() },
    });
  } else {
    const normalized = normalizeIdentifier(raw);
    if (normalized.length >= MIN_IDENTIFIER_LENGTH) {
      user = await prisma.user.findUnique({
        where: { username: normalized },
      });
    }
  }
  if (!user || !user.passwordHash) return { error: "Invalid email/username or password" };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid email/username or password" };
  return { user };
}

/** Find user by OAuth provider + provider id */
export async function findUserByOAuth(provider: string, oauthId: string) {
  return prisma.user.findUnique({
    where: {
      oauth_provider_oauth_id: { oauth_provider: provider, oauth_id: oauthId },
    },
  });
}

/** Derive a unique username from OAuth display name (e.g. "John Doe" -> "john_doe", or "john_doe_1" if taken). */
async function findUniqueUsernameFromDisplayName(displayName: string | null): Promise<string> {
  const base = displayName?.trim()
    ? normalizeIdentifier(displayName)
    : "";
  const candidate = base.length >= MIN_IDENTIFIER_LENGTH ? base : "user";
  let username = candidate;
  let n = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    n += 1;
    username = `${candidate}_${n}`;
    if (username.length > 32) username = `user_${n}`;
  }
  return username;
}

/** Create user from OAuth; referral code, balance, and unique username (from display name) set like normal signup */
export async function createUserFromOAuth(params: {
  provider: string;
  oauthId: string;
  oauthEmail: string | null;
  oauthPicture: string | null;
  name: string | null;
}) {
  let code = generateReferralCode();
  while (await prisma.user.findUnique({ where: { referralCode: code } })) {
    code = generateReferralCode();
  }
  const username = await findUniqueUsernameFromDisplayName(params.name);
  const email = params.oauthEmail?.trim() || null;
  const user = await prisma.user.create({
    data: {
      email,
      name: params.name ?? null,
      username,
      referralCode: code,
      balance: 1000,
      oauth_provider: params.provider,
      oauth_id: params.oauthId,
      oauth_email: params.oauthEmail ?? null,
      oauth_picture: params.oauthPicture ?? null,
    },
  });
  return { user };
}

/** Link OAuth to existing user (e.g. after merge confirmation) */
export async function linkOAuthToUser(
  userId: string,
  provider: string,
  oauthId: string,
  oauthEmail: string | null,
  oauthPicture: string | null
) {
  const existing = await prisma.user.findUnique({
    where: { oauth_provider_oauth_id: { oauth_provider: provider, oauth_id: oauthId } },
  });
  if (existing && existing.id !== userId) return { error: "This Google/Facebook account is already linked to another user." };
  await prisma.user.update({
    where: { id: userId },
    data: {
      oauth_provider: provider,
      oauth_id: oauthId,
      oauth_email: oauthEmail ?? null,
      oauth_picture: oauthPicture ?? null,
    },
  });
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Find user by wallet address (normalized lowercase). */
export async function findUserByWallet(address: string) {
  const normalized = address?.trim().toLowerCase();
  if (!normalized || !normalized.startsWith("0x")) return null;
  return prisma.user.findUnique({
    where: { walletAddress: normalized },
    select: { id: true, email: true, username: true, passwordHash: true },
  });
}

/** Create full user from wallet path: wallet + username + email + password (Unified Identity). */
export async function createUserWithWallet(params: {
  walletAddress: string;
  email: string;
  username: string;
  password: string;
  referralCode?: string;
}) {
  const normalized = params.walletAddress.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { walletAddress: normalized },
  });
  if (existing) return { error: "Wallet already linked to another account." };

  const emailExisting = await prisma.user.findUnique({
    where: { email: params.email.toLowerCase() },
  });
  if (emailExisting) return { error: "Email already registered." };

  const v = validateIdentifierSafe(String(params.username).trim());
  if (!v.ok) return { error: v.error };
  const existingUsername = await prisma.user.findUnique({ where: { username: v.value } });
  if (existingUsername) return { error: "Username already taken" };
  const username = v.value;

  let referredById: string | null = null;
  if (params.referralCode?.trim()) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: params.referralCode.trim().toUpperCase() },
    });
    if (referrer) referredById = referrer.id;
  }

  let code = generateReferralCode();
  while (await prisma.user.findUnique({ where: { referralCode: code } })) {
    code = generateReferralCode();
  }

  const hash = await hashPassword(params.password);
  const user = await prisma.user.create({
    data: {
      walletAddress: normalized,
      email: params.email.trim().toLowerCase(),
      username,
      passwordHash: hash,
      referralCode: code,
      referredById,
      balance: 1000,
    },
  });
  return { user };
}

/** Complete profile for OAuth user: set username + password + optional referral (Unified Identity). */
export async function completeProfileForOAuthUser(
  userId: string,
  params: { username: string; password: string; referralCode?: string }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, username: true },
  });
  if (!user) return { error: "User not found." };
  if (user.passwordHash) return { error: "Profile already completed." };

  const v = validateIdentifierSafe(String(params.username).trim());
  if (!v.ok) return { error: v.error };
  const existingUsername = await prisma.user.findUnique({ where: { username: v.value } });
  if (existingUsername && existingUsername.id !== userId) return { error: "Username already taken." };
  const username = v.value;

  let referredById: string | null = null;
  if (params.referralCode?.trim()) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: params.referralCode.trim().toUpperCase() },
    });
    if (referrer) referredById = referrer.id;
  }

  const hash = await hashPassword(params.password);
  await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      passwordHash: hash,
      referredById: referredById ?? undefined,
    },
  });
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Complete profile for existing wallet user (wallet in DB but no password/email/username yet). */
export async function completeProfileForWalletUser(
  walletAddress: string,
  params: { username: string; email: string; password: string; referralCode?: string }
) {
  const normalized = walletAddress.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { walletAddress: normalized },
    select: { id: true, passwordHash: true, email: true },
  });
  if (!user) return { error: "Wallet not found." };
  if (user.passwordHash) return { error: "Profile already completed." };

  const emailLower = params.email.trim().toLowerCase();
  const emailExisting = await prisma.user.findUnique({
    where: { email: emailLower },
  });
  if (emailExisting && emailExisting.id !== user.id) return { error: "Email already registered." };

  const v = validateIdentifierSafe(String(params.username).trim());
  if (!v.ok) return { error: v.error };
  const existingUsername = await prisma.user.findUnique({ where: { username: v.value } });
  if (existingUsername && existingUsername.id !== user.id) return { error: "Username already taken." };
  const username = v.value;

  let referredById: string | null = null;
  if (params.referralCode?.trim()) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: params.referralCode.trim().toUpperCase() },
    });
    if (referrer) referredById = referrer.id;
  }

  const hash = await hashPassword(params.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      email: emailLower,
      passwordHash: hash,
      referredById: referredById ?? undefined,
    },
  });
  return prisma.user.findUnique({ where: { id: user.id } });
}
