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
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // /api/auth/me returns 503 on a transient Logto outage while preserving the
    // session cookies. Retry once before resolving to unauthenticated so a brief
    // blip doesn't flip the UI to logged-out.
    const load = async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/auth/me", {
            credentials: "include",
            signal: controller.signal,
          });
          if (res.status === 503 && attempt === 0) {
            // Delay before retry. The timer is cleared on unmount (below), so
            // it can't run after the component is gone; the 1.5s wait is well
            // inside the 10s abort window.
            await new Promise<void>((resolve) => {
              retryTimer = setTimeout(resolve, 1500);
            });
            if (controller.signal.aborted) {
              finish(null);
              return;
            }
            continue;
          }
          const data = res.ok ? await res.json() : null;
          finish((data?.user as AuthUser | null) ?? null);
          return;
        } catch {
          finish(null);
          return;
        }
      }
      finish(null);
    };
    void load();
    return () => {
      settled = true;
      clearTimeout(timeout);
      if (retryTimer) clearTimeout(retryTimer);
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
