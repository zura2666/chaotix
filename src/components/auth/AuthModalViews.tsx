"use client";

import { useState } from "react";
import {
  Lock,
  User,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { IconWrapper } from "@/components/ui/IconWrapper";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { WalletIconGrid } from "./WalletIconGrid";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthView = "LOGIN" | "SIGNUP" | "WALLET_LINKING" | "PROFILE_COMPLETION";
export type ProfileCompletionOrigin = "wallet" | "google";

export type ProfileCompletionData = {
  origin: ProfileCompletionOrigin;
  walletAddress?: string;
  email?: string;
  name?: string;
};

export type LoginFormData = { identifier: string; password: string };
export type SignUpFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
  referralExpanded: boolean;
};
export type ProfileCompletionFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
};

export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1b6cfb] py-3.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}

export function OrSeparator() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-medium text-slate-500">OR</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

type LoginViewProps = {
  form: LoginFormData;
  setForm: (f: LoginFormData | ((prev: LoginFormData) => LoginFormData)) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogle: () => void;
  onConnectWallet: () => void;
  loading: boolean;
  error: string | null;
  hasWalletSupport: boolean;
  onSwitchToSignUp?: () => void;
};

/** Polymarket-style: Google first, OR, email+Continue nested, password, wallet grid. */
export function LoginView({
  form,
  setForm,
  onSubmit,
  onGoogle,
  onConnectWallet,
  loading,
  error,
  hasWalletSupport,
  onSwitchToSignUp,
}: LoginViewProps) {
  return (
    <div className="animate-fade-in space-y-5">
      <GoogleButton onClick={onGoogle} />
      <OrSeparator />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-identifier" className="sr-only">
            Email or username
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <input
              id="login-identifier"
              type="text"
              autoComplete="username email"
              value={form.identifier}
              onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
              placeholder="Email or username"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="my-1 mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white outline-none transition hover:bg-emerald-400 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Continue"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <ChevronRight className="h-5 w-5" strokeWidth={2} />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-xs font-medium text-slate-500">
            Password
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <Lock strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
        {error && <p className="mt-1 text-sm text-red-400" role="alert">{error}</p>}
      </form>
      {hasWalletSupport && (
        <>
          <div className="pt-1">
            <p className="mb-3 text-center text-xs text-slate-500">Connect a wallet</p>
            <WalletIconGrid onConnect={onConnectWallet} />
          </div>
        </>
      )}
      {onSwitchToSignUp && (
        <p className="pt-2 text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onSwitchToSignUp} className="font-medium text-chaos-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
            Sign up
          </button>
        </p>
      )}
    </div>
  );
}

type SignUpViewProps = {
  form: SignUpFormData;
  setForm: (f: SignUpFormData | ((prev: SignUpFormData) => SignUpFormData)) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogle: () => void;
  onConnectWallet: () => void;
  loading: boolean;
  error: string | null;
  hasWalletSupport: boolean;
};

export function SignUpView({
  form,
  setForm,
  onSubmit,
  onGoogle,
  onConnectWallet,
  loading,
  error,
  hasWalletSupport,
  onSwitchToLogin,
}: SignUpViewProps) {
  const emailValid = EMAIL_REGEX.test(form.email.trim());
  const passwordsMatch = form.password === form.confirmPassword && form.password.length >= 8;

  return (
    <div className="animate-fade-in space-y-5">
      <GoogleButton onClick={onGoogle} />
      <OrSeparator />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-username" className="mb-1 block text-xs font-medium text-slate-500">
            Username
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <User strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="3–32 chars, letters, numbers, _ or -"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1 block text-xs font-medium text-slate-500">
            Email
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full bg-transparent px-4 text-base text-white outline-none placeholder:text-slate-500"
            />
          </div>
          {form.email.length > 0 && !emailValid && (
            <p className="mt-1 text-xs text-amber-400">Enter a valid email address.</p>
          )}
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-1 block text-xs font-medium text-slate-500">
            Password
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <Lock strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min 8 characters"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <PasswordStrengthMeter password={form.password} />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="mb-1 block text-xs font-medium text-slate-500">
            Confirm password
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <Lock strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          {form.confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-sm text-red-400">Passwords do not match or are too short.</p>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, referralExpanded: !p.referralExpanded }))}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-left text-sm text-slate-500 outline-none transition hover:border-white/20 hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Referral code (optional)
            {form.referralExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {form.referralExpanded && (
            <input
              type="text"
              value={form.referralCode}
              onChange={(e) => setForm((p) => ({ ...p, referralCode: e.target.value.toUpperCase() }))}
              placeholder="e.g. ABC12345"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
          )}
        </div>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading || !emailValid || !passwordsMatch}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-semibold text-white shadow-emerald-glow transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
        </button>
      </form>
      {hasWalletSupport && (
        <div className="pt-1">
          <p className="mb-3 text-center text-xs text-slate-500">Connect a wallet</p>
          <WalletIconGrid onConnect={onConnectWallet} />
        </div>
      )}
      {onSwitchToLogin && (
        <p className="pt-2 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} className="font-medium text-chaos-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded">
            Log in
          </button>
        </p>
      )}
    </div>
  );
}

type ProfileCompletionViewProps = {
  origin: ProfileCompletionOrigin;
  pendingData: ProfileCompletionData;
  form: ProfileCompletionFormData;
  setForm: (f: ProfileCompletionFormData | ((prev: ProfileCompletionFormData) => ProfileCompletionFormData)) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
};

export function ProfileCompletionView({
  origin,
  pendingData,
  form,
  setForm,
  onSubmit,
  loading,
  error,
}: ProfileCompletionViewProps) {
  const isGoogle = origin === "google";
  const emailValid = !form.email ? true : EMAIL_REGEX.test(form.email.trim());
  const passwordsMatch = form.password === form.confirmPassword && form.password.length >= 8;

  return (
    <div className="animate-fade-in space-y-5">
      <p className="text-center text-sm text-slate-500">
        {isGoogle
          ? "Set a username and password so you can always log in with credentials."
          : "Complete your account. You'll need a username and password for backup login."}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="profile-username" className="mb-1 block text-xs font-medium text-slate-500">
            Username
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <User strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="profile-username"
              type="text"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="3–32 chars"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
        {!isGoogle && (
          <div>
            <label htmlFor="profile-email" className="mb-1 block text-xs font-medium text-slate-500">
              Email
            </label>
            <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
              <input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-transparent px-4 text-base text-white outline-none placeholder:text-slate-500"
              />
            </div>
            {form.email.length > 0 && !emailValid && (
              <p className="mt-1 text-xs text-amber-400">Enter a valid email.</p>
            )}
          </div>
        )}
        <div>
          <label htmlFor="profile-password" className="mb-1 block text-xs font-medium text-slate-500">
            Password
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <Lock strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="profile-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min 8 characters"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <PasswordStrengthMeter password={form.password} />
        </div>
        <div>
          <label htmlFor="profile-confirm" className="mb-1 block text-xs font-medium text-slate-500">
            Confirm password
          </label>
          <div className="flex h-14 min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-slate-900/50 transition-[border-color,box-shadow] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <div className="flex shrink-0 items-center pl-4">
              <IconWrapper className="text-slate-500">
                <Lock strokeWidth={1.5} aria-hidden />
              </IconWrapper>
            </div>
            <input
              id="profile-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="profile-referral" className="mb-1 block text-xs font-medium text-slate-500">
            Referral code (optional)
          </label>
          <input
            id="profile-referral"
            type="text"
            value={form.referralCode}
            onChange={(e) => setForm((p) => ({ ...p, referralCode: e.target.value.toUpperCase() }))}
            placeholder="ABC12345"
            className="h-14 min-h-[3.5rem] w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 text-sm text-white outline-none placeholder:text-slate-500 transition-[border-color,box-shadow] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-400" role="alert">{error}</p>}
        <ChaotixButton
          type="submit"
          disabled={loading || !passwordsMatch || (!isGoogle && !emailValid)}
          variant="primary"
          className="h-14 min-h-[3.5rem] w-full gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} /> : "Complete Your Chaotix Profile"}
        </ChaotixButton>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
