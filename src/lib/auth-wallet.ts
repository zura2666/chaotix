import { prisma } from "@/lib/db";

const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LEN = 8;

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < LEN; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return code;
}

export async function findOrCreateUserByWallet(address: string) {
  const normalized = address.toLowerCase().trim();
  let user = await prisma.user.findUnique({
    where: { walletAddress: normalized },
  });
  if (user) return user;

  let referralCode = generateReferralCode();
  while (await prisma.user.findUnique({ where: { referralCode } })) {
    referralCode = generateReferralCode();
  }

  const username = `wallet_${normalized.slice(2, 10)}`;
  let uname = username;
  let n = 0;
  while (await prisma.user.findUnique({ where: { username: uname } })) {
    n += 1;
    uname = `wallet_${normalized.slice(2, 10)}_${n}`.slice(0, 32);
  }

  user = await prisma.user.create({
    data: {
      walletAddress: normalized,
      referralCode,
      balance: 1000,
      username: uname,
    },
  });
  return user;
}

export async function linkWalletToUser(userId: string, address: string) {
  const normalized = address.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { walletAddress: normalized },
  });
  if (existing && existing.id !== userId)
    return { error: "Wallet already linked to another account" };
  await prisma.user.update({
    where: { id: userId },
    data: { walletAddress: normalized },
  });
  return { ok: true };
}
