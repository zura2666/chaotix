import { SiweMessage } from "siwe";

const DOMAIN = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const nonceStore = new Map<string, { nonce: string; expires: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 min

export function createNonce(address: string): string {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  nonceStore.set(address.toLowerCase(), {
    nonce,
    expires: Date.now() + NONCE_TTL_MS,
  });
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const key = address.toLowerCase();
  const entry = nonceStore.get(key);
  if (!entry || entry.nonce !== nonce || Date.now() > entry.expires) return false;
  nonceStore.delete(key);
  return true;
}

export async function verifySiweMessage(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const siwe = new SiweMessage(message);
    const address = siwe.address?.toLowerCase();
    const expected = expectedAddress.toLowerCase();
    if (!address || address !== expected) return false;
    if (!consumeNonce(expected, siwe.nonce)) return false;
    const result = await siwe.verify({ signature });
    return !!(result && (result as { success?: boolean }).success !== false);
  } catch {
    return false;
  }
}

export function getDomain(): string {
  try {
    return new URL(DOMAIN).host;
  } catch {
    return "localhost";
  }
}
