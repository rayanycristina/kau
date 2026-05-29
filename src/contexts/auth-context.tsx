"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserProfile } from "@/data/user-profile-types";

type AuthContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        setProfile(null);
        return;
      }
      const payload = await response.json();
      setProfile(payload.profile ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setIsLoading(false));
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setProfile(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isAdmin: profile?.role === "admin" && profile.isActive,
      isSeller: profile?.role === "seller" && profile.isActive,
      refreshProfile,
      signOut
    }),
    [profile, isLoading, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
