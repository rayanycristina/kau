"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserProfile } from "@/data/user-profile-types";

type AuthContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isPlatformAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let cachedProfile: UserProfile | null | undefined;
let pendingProfileRequest: Promise<UserProfile | null> | null = null;

function requestProfile() {
  if (pendingProfileRequest) return pendingProfileRequest;

  pendingProfileRequest = fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = await response.json();
      return (payload.profile ?? null) as UserProfile | null;
    })
    .catch(() => null)
    .then((profile) => {
      cachedProfile = profile;
      return profile;
    })
    .finally(() => {
      pendingProfileRequest = null;
    });

  return pendingProfileRequest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => cachedProfile ?? null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setProfile(await requestProfile());
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setIsLoading(false));
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    cachedProfile = null;
    pendingProfileRequest = null;
    setProfile(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isAdmin: profile?.role === "admin" && profile.isActive,
      isSeller: profile?.role === "seller" && profile.isActive,
      isPlatformAdmin: Boolean(profile?.isPlatformAdmin),
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
