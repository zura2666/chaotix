"use client";

import { useState, useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
    FB?: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean }) => void;
      login: (callback: (res: { authResponse?: { accessToken: string } }) => void, options: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type OAuthButtonsProps = {
  onSuccess: (user: { id: string; email: string | null; name: string | null; username?: string | null; referralCode: string; balance: number; isAdmin?: boolean }) => void;
  onError: (message: string) => void;
  onNeedsLink?: (data: { email: string; message: string }) => void;
  disabled?: boolean;
};

const GOOGLE_CLIENT_ID = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "") : "";
const FACEBOOK_APP_ID = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "") : "";

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${id}`));
    document.head.appendChild(script);
  });
}

export function OAuthButtons({ onSuccess, onError, onNeedsLink, disabled }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const sendToken = useCallback(
    async (provider: "google" | "facebook", accessToken: string) => {
      setLoading(provider);
      try {
        const res = await fetch("/api/auth/oauth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, access_token: accessToken }),
        });
        const data = await res.json();
        if (data.needsLink && onNeedsLink) {
          onNeedsLink({ email: data.email, message: data.message ?? "An account with this email already exists." });
          return;
        }
        if (!res.ok) {
          onError(data.error ?? "Sign in failed.");
          return;
        }
        if (data.user) onSuccess(data.user);
      } catch {
        onError("Network error. Try again.");
      } finally {
        setLoading(null);
      }
    },
    [onSuccess, onError, onNeedsLink]
  );
  const sendTokenRef = useRef(sendToken);
  sendTokenRef.current = sendToken;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    let mounted = true;
    loadScript("https://accounts.google.com/gsi/client", "gsi-script")
      .then(() => {
        if (!mounted || !window.google?.accounts?.id || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => sendTokenRef.current("google", res.credential),
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "medium",
          text: "continue_with",
          width: googleButtonRef.current.offsetWidth || 200,
        });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    loadScript("https://connect.facebook.net/en_US/sdk.js", "facebook-sdk")
      .then(() => {
        window.fbAsyncInit = () => {
          window.FB?.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false });
        };
        if (window.FB) window.fbAsyncInit?.();
      })
      .catch(() => {});
  }, []);

  const handleFacebookClick = () => {
    if (!window.FB || !FACEBOOK_APP_ID) {
      onError("Facebook sign-in is not configured.");
      return;
    }
    window.FB.login(
      (res) => {
        if (res.authResponse?.accessToken) {
          sendToken("facebook", res.authResponse.accessToken);
        } else {
          onError("Facebook sign-in was cancelled or failed.");
        }
      },
      { scope: "email,public_profile" }
    );
  };

  if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-slate-500">Or continue with</p>
      <div className="grid grid-cols-2 gap-2">
        {GOOGLE_CLIENT_ID && (
          <div ref={googleButtonRef} className="flex min-h-[40px] items-center justify-center [&>div]:!mx-auto">
            {loading === "google" && <span className="animate-pulse text-sm text-slate-500">...</span>}
          </div>
        )}
        {FACEBOOK_APP_ID && (
          <button
            type="button"
            onClick={handleFacebookClick}
            disabled={disabled || loading !== null}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-900/40 py-2.5 text-sm font-medium text-white hover:border-emerald-500/40 disabled:opacity-50"
          >
            {loading === "facebook" ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
