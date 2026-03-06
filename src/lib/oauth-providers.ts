/**
 * Server-side OAuth token verification for Google and Facebook.
 * Never trust frontend; always validate tokens with provider APIs.
 */

export type OAuthUserInfo = {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

/**
 * Verify Google id_token or access_token and return user info.
 * Uses https://oauth2.googleapis.com/tokeninfo
 */
export async function verifyGoogleToken(accessTokenOrIdToken: string): Promise<OAuthUserInfo | null> {
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(accessTokenOrIdToken)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const alt = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessTokenOrIdToken)}`;
      const altRes = await fetch(alt, { method: "GET" });
      if (!altRes.ok) return null;
      const data = (await altRes.json()) as { user_id?: string; email?: string; email_verified?: string; name?: string; picture?: string };
      return {
        id: data.user_id ?? "",
        email: data.email ?? null,
        name: data.name ?? null,
        picture: data.picture ?? null,
      };
    }
    const data = (await res.json()) as { sub?: string; email?: string; email_verified?: string; name?: string; picture?: string };
    return {
      id: data.sub ?? "",
      email: data.email ?? null,
      name: data.name ?? null,
      picture: data.picture ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Verify Facebook access_token via Graph API /me and debug_token.
 * Requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.
 */
export async function verifyFacebookToken(accessToken: string): Promise<OAuthUserInfo | null> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return null;
  try {
    const appAccessToken = `${appId}|${appSecret}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`;
    const debugRes = await fetch(debugUrl);
    if (!debugRes.ok) return null;
    const debugData = (await debugRes.json()) as { data?: { valid?: boolean; user_id?: string } };
    if (!debugData.data?.valid || !debugData.data.user_id) return null;

    const meUrl = `https://graph.facebook.com/me?fields=id,email,name,picture&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    if (!meRes.ok) return null;
    const meData = (await meRes.json()) as { id?: string; email?: string; name?: string; picture?: { data?: { url?: string } } };
    return {
      id: meData.id ?? debugData.data.user_id,
      email: meData.email ?? null,
      name: meData.name ?? null,
      picture: meData.picture?.data?.url ?? null,
    };
  } catch {
    return null;
  }
}

export async function verifyOAuthToken(
  provider: "google" | "facebook",
  accessToken: string
): Promise<OAuthUserInfo | null> {
  if (provider === "google") return verifyGoogleToken(accessToken);
  if (provider === "facebook") return verifyFacebookToken(accessToken);
  return null;
}
