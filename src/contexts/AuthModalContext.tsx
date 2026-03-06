"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AuthModal, type User } from "@/components/AuthModal";
import type { AuthView } from "@/components/auth/AuthModalViews";
import type { ProfileCompletionData } from "@/components/auth/AuthModalViews";

type AuthModalContextValue = {
  user: User | null;
  openAuth: (view?: "LOGIN" | "SIGNUP", profileData?: ProfileCompletionData) => void;
  closeAuth: () => void;
  refreshUser: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [initialView, setInitialView] = useState<AuthView>("LOGIN");
  const [initialProfileData, setInitialProfileData] = useState<ProfileCompletionData | undefined>();

  const refreshUser = useCallback(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        if (d.user && d.needsProfileCompletion) {
          setInitialView("PROFILE_COMPLETION");
          setInitialProfileData({
            origin: "google",
            email: d.user.email ?? undefined,
            name: d.user.name ?? undefined,
          });
          setOpen(true);
        }
      });
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const openAuth = useCallback(
    (view?: "LOGIN" | "SIGNUP", profileData?: ProfileCompletionData) => {
      if (view) setInitialView(view);
      if (profileData) setInitialProfileData(profileData);
      setOpen(true);
    },
    []
  );

  const closeAuth = useCallback(() => {
    setOpen(false);
    setInitialProfileData(undefined);
  }, []);

  const onSuccess = useCallback(
    (u: User) => {
      setUser(u);
      closeAuth();
      router.refresh();
      // Refetch so we get the full user from the session cookie (fixes instant logout / wallet sign-in)
      refreshUser();
    },
    [closeAuth, router, refreshUser]
  );

  return (
    <AuthModalContext.Provider
      value={{ user, openAuth, closeAuth, refreshUser }}
    >
      {children}
      <AuthModal
        open={open}
        onClose={closeAuth}
        onSuccess={onSuccess}
        initialView={initialView}
        initialProfileData={initialProfileData}
      />
    </AuthModalContext.Provider>
  );
}
