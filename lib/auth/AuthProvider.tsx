"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthContextValue, AuthUser } from "types/auth";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

// Hydrates the session from the HttpOnly cookie via /api/auth/me, then exposes
// redirect-based sign-in / logout. Tokens live in cookies, never in JS.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let settled = false;
    // `settled` is set on unmount so we never setState after unmount; a timeout
    // abort still resolves to unauthenticated (settled is false), so a hanging
    // /me can't trap the UI in the loading state.
    const finish = (next: AuthUser | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      setUser(next);
      setHydrated(true);
    };
    const timeout = setTimeout(() => controller.abort(), 10_000);
    fetch("/api/auth/me", {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => finish((data?.user as AuthUser | null) ?? null))
      .catch(() => finish(null));
    return () => {
      settled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const signIn = useCallback((redirectTo?: string) => {
    const query = redirectTo
      ? `?redirect=${encodeURIComponent(redirectTo)}`
      : "";
    window.location.assign(`/api/auth/sign-in${query}`);
  }, []);

  const logout = useCallback(() => {
    window.location.assign("/api/auth/sign-out");
  }, []);

  const status = !hydrated
    ? ("loading" as const)
    : user
      ? ("authenticated" as const)
      : ("unauthenticated" as const);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      signIn,
      logout,
    }),
    [status, user, signIn, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
