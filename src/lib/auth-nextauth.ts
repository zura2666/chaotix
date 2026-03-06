import NextAuth from "next-auth";
import type { AdapterUser } from "@auth/core/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifySiweMessage } from "@/lib/siwe";
import { findOrCreateUserByWallet } from "@/lib/auth-wallet";

const CHAOTIX_REFERRAL_LENGTH = 8;
const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < CHAOTIX_REFERRAL_LENGTH; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return code;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: (() => {
    const base = PrismaAdapter(prisma);
    return {
      ...base,
      createUser: async (data) => {
        let code = generateReferralCode();
        while (await prisma.user.findUnique({ where: { referralCode: code } })) {
          code = generateReferralCode();
        }
        const username = (data.name ?? data.email ?? "user")
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, "_")
          .replace(/_+/g, "_")
          .slice(0, 32) || "user";
        let uname = username;
        let n = 0;
        while (await prisma.user.findUnique({ where: { username: uname } })) {
          n += 1;
          uname = `${username}_${n}`.slice(0, 32);
        }
        const user = await prisma.user.create({
          data: {
            name: data.name ?? null,
            email: data.email ?? null,
            emailVerified: data.emailVerified ?? null,
            image: data.image ?? null,
            referralCode: code,
            balance: 1000,
            username: uname,
          },
        });
        return user as unknown as AdapterUser;
      },
    };
  })(),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Email({
      sendVerificationRequest: async ({ identifier: email, url }) => {
        if (process.env.AUTH_RESEND_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.AUTH_EMAIL_FROM ?? "Chaotix <noreply@chaotix.dev>",
              to: email,
              subject: "Sign in to Chaotix",
              html: `Click to sign in: <a href="${url}">${url}</a>`,
            }),
          });
        } else if (process.env.NODE_ENV === "development") {
          console.log("[Auth] Magic link for", email, ":", url);
        }
      },
    }),
    Credentials({
      id: "wallet",
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.address || !credentials?.signature || !credentials?.message)
          return null;
        const address = String(credentials.address).trim();
        const signature = String(credentials.signature);
        const message = String(credentials.message);
        const ok = await verifySiweMessage(message, signature, address);
        if (!ok) return null;
        const user = await findOrCreateUserByWallet(address);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.picture = session.image ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { referralCode?: string }).referralCode = undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (user?.email && account?.provider !== "credentials") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (existing && existing.id !== user.id) {
          return "/auth/error?error=AccountExists";
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  trustHost: true,
});
