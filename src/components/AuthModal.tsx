"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useClickOutside } from "@/hooks/useClickOutside";
import { signIn } from "next-auth/react";
import { X } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletSupport } from "./Providers";
import {
  type AuthView,
  type ProfileCompletionData,
  type LoginFormData,
  type SignUpFormData,
  type ProfileCompletionFormData,
  LoginView,
  SignUpView,
  ProfileCompletionView,
} from "./auth/AuthModalViews";

export type User = {
  id: string;
  email: string | null;
  name: string | null;
  username?: string | null;
  referralCode: string;
  balance: number;
  isAdmin?: boolean;
  walletAddress?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
  /** Initial view when opening (e.g. after Google sign-in when needsProfileCompletion) */
  initialView?: AuthView;
  initialProfileData?: ProfileCompletionData;
};

const defaultLoginForm: LoginFormData = { identifier: "", password: "" };
const defaultSignUpForm: SignUpFormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
  referralExpanded: false,
};
const defaultProfileForm: ProfileCompletionFormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
};

/** Wallet block: connect + SIWE or pivot to profile completion. Only rendered when Wagmi is available. */
function WalletSection({
  onNeedProfileCompletion,
  onSignedIn,
  setError,
}: {
  onNeedProfileCompletion: (walletAddress: string) => void;
  onSignedIn: () => void;
  setError: (s: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!address || !isConnected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/wallet-check?address=${encodeURIComponent(address)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.exists && data.hasPassword) {
          // Let them click "Sign in with wallet" to do SIWE
          return;
        }
        if (data.exists && !data.hasPassword) {
          onNeedProfileCompletion(address);
          return;
        }
        if (!data.exists) {
          onNeedProfileCompletion(address);
        }
      } catch {
        if (!cancelled) setError("Could not check wallet.");
      }
    })();
    return () => { cancelled = true; };
  }, [address, isConnected, onNeedProfileCompletion, setError]);

  const handleWalletSignIn = async () => {
    if (!address) return;
    setError(null);
    setLoading(true);
    try {
      const nonceRes = await fetch(`/api/auth/siwe/nonce?address=${encodeURIComponent(address)}`);
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error("No nonce");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const domain = typeof window !== "undefined" ? window.location.host : "";
      const message = new SiweMessage({
        domain,
        address,
        statement: "Sign in to Chaotix",
        uri: origin,
        version: "1",
        chainId: 1,
        nonce,
      });
      const msg = message.prepareMessage();
      const signature = await signMessageAsync({ message: msg });
      const result = await signIn("credentials", {
        id: "wallet",
        address,
        signature,
        message: msg,
        redirect: false,
      });
      if (result?.ok) {
        onSignedIn();
      } else {
        setError("Wallet sign-in failed.");
      }
    } catch (e) {
      setError("Wallet sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            type="button"
            onClick={openConnectModal}
            className="flex w-full h-13 items-center justify-center gap-3 rounded-xl border border-white/10 bg-black/40 py-3.5 text-sm font-medium text-slate-200 outline-none transition hover:border-emerald-500/40 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    );
  }
  return (
    <button
      type="button"
      onClick={handleWalletSignIn}
      disabled={loading}
      className="flex w-full h-13 items-center justify-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 py-3.5 text-sm font-medium text-emerald-400 outline-none transition hover:bg-emerald-500/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {loading ? "Signing…" : "Sign in with wallet"}
    </button>
  );
}

export function AuthModal({
  open,
  onClose,
  onSuccess,
  initialView = "LOGIN",
  initialProfileData,
}: Props) {
  const pathname = usePathname();
  const hasWalletSupport = useWalletSupport();
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState<AuthView>(initialView);
  const [profileData, setProfileData] = useState<ProfileCompletionData | null>(initialProfileData ?? null);
  const [loginForm, setLoginForm] = useState<LoginFormData>(defaultLoginForm);
  const [signUpForm, setSignUpForm] = useState<SignUpFormData>(defaultSignUpForm);
  const [profileForm, setProfileForm] = useState<ProfileCompletionFormData>(defaultProfileForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentView(initialView);
      setProfileData(initialProfileData ?? null);
      setError(null);
      if (initialProfileData) {
        setProfileForm((p) => ({
          ...p,
          email: initialProfileData.email ?? "",
        }));
      }
    }
  }, [open, initialView, initialProfileData]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_or_username: loginForm.identifier,
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      onSuccess?.(data.user);
      onClose();
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }, [loginForm.identifier, loginForm.password, onClose, onSuccess]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          username: signUpForm.username,
          email: signUpForm.email,
          password: signUpForm.password,
          confirm_password: signUpForm.confirmPassword,
          referralCode: signUpForm.referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign up failed.");
        return;
      }
      onSuccess?.(data.user);
      onClose();
    } catch {
      setError("Sign up failed.");
    } finally {
      setLoading(false);
    }
  }, [signUpForm, onClose, onSuccess]);

  const handleCompleteProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          profileData.origin === "wallet"
            ? {
                origin: "wallet",
                walletAddress: profileData.walletAddress,
                email: profileForm.email.trim(),
                username: profileForm.username.trim(),
                password: profileForm.password,
                referralCode: profileForm.referralCode || undefined,
              }
            : {
                origin: "google",
                username: profileForm.username.trim(),
                password: profileForm.password,
                referralCode: profileForm.referralCode || undefined,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete profile.");
        return;
      }
      onSuccess?.(data.user);
      onClose();
    } catch {
      setError("Could not complete profile.");
    } finally {
      setLoading(false);
    }
  }, [profileData, profileForm, onClose, onSuccess]);

  const handleGoogle = useCallback(async () => {
    setError(null);
    await signIn("google", { callbackUrl: "/" });
    onClose();
  }, [onClose]);

  const handleConnectWallet = useCallback(() => {
    setError(null);
    if (!hasWalletSupport) return;
    setCurrentView("WALLET_LINKING");
    // WalletSection will open RainbowKit; when connected, wallet-check runs and may set PROFILE_COMPLETION
  }, [hasWalletSupport]);

  const handleWalletNeedProfile = useCallback((walletAddress: string) => {
    setProfileData({ origin: "wallet", walletAddress });
    setCurrentView("PROFILE_COMPLETION");
    setProfileForm((p) => ({ ...p, email: "" }));
  }, []);

  const title =
    currentView === "LOGIN"
      ? "Welcome to Chaotix"
      : currentView === "SIGNUP"
        ? "Welcome to Chaotix"
        : currentView === "PROFILE_COMPLETION"
          ? "Complete Your Chaotix Profile"
          : "Connect wallet";

  const modalPanelRef = useClickOutside<HTMLDivElement>(onClose, open);

  const modalContent = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={modalPanelRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[90%] max-w-[400px] rounded-2xl border border-white/10 bg-[#0B0F1A] p-6 md:p-8 shadow-xl"
      >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 outline-none transition hover:bg-white/5 hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <h2 id="auth-modal-title" className="mb-2 text-center text-2xl font-semibold tracking-tight text-slate-100">
              {title}
            </h2>

            {currentView === "LOGIN" && (
              <LoginView
                form={loginForm}
                setForm={setLoginForm}
                onSubmit={handleLogin}
                onGoogle={handleGoogle}
                onConnectWallet={handleConnectWallet}
                loading={loading}
                error={error}
                hasWalletSupport={hasWalletSupport}
                onSwitchToSignUp={() => { setCurrentView("SIGNUP"); setError(null); }}
              />
            )}

            {currentView === "SIGNUP" && (
              <SignUpView
                form={signUpForm}
                setForm={setSignUpForm}
                onSubmit={handleSignUp}
                onGoogle={handleGoogle}
                onConnectWallet={handleConnectWallet}
                loading={loading}
                error={error}
                hasWalletSupport={hasWalletSupport}
                onSwitchToLogin={() => { setCurrentView("LOGIN"); setError(null); }}
              />
            )}

            {currentView === "WALLET_LINKING" && (
              <div className="space-y-4">
                {hasWalletSupport ? (
                  <WalletSection
                    onNeedProfileCompletion={handleWalletNeedProfile}
                    onSignedIn={() => { onSuccess?.({ id: "", email: null, name: null, referralCode: "", balance: 0 }); onClose(); }}
                    setError={setError}
                  />
                ) : (
                  <p className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-center text-xs text-slate-500">
                    Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable wallet login.
                  </p>
                )}
                {error && <p className="mt-1 text-sm text-red-400" role="alert">{error}</p>}
                <button
                  type="button"
                  onClick={() => { setCurrentView("LOGIN"); setError(null); }}
                  className="w-full text-center text-sm text-slate-500 outline-none hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
                >
                  Back to log in
                </button>
              </div>
            )}

            {currentView === "PROFILE_COMPLETION" && profileData && (
              <div>
                <ProfileCompletionView
                  origin={profileData.origin}
                  pendingData={profileData}
                  form={profileForm}
                  setForm={setProfileForm}
                  onSubmit={handleCompleteProfile}
                  loading={loading}
                  error={error}
                />
              </div>
            )}

            <p className="mt-10 flex w-full justify-center gap-1 text-center text-xs text-slate-500">
              <a
                href="/terms"
                onClick={() => onClose()}
                className={`rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${pathname === "/terms" ? "text-emerald-400" : "hover:text-slate-400"}`}
              >
                Terms
              </a>
              <span aria-hidden>·</span>
              <a
                href="/privacy"
                onClick={() => onClose()}
                className={`rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${pathname === "/privacy" ? "text-emerald-400" : "hover:text-slate-400"}`}
              >
                Privacy
              </a>
            </p>
      </div>
    </div>
  ) : null;

  if (!mounted || typeof document === "undefined") return null;
  if (!open) return null;
  const portalRoot = document.getElementById("auth-modal-portal");
  if (!portalRoot) return null;
  return createPortal(modalContent, portalRoot);
}
