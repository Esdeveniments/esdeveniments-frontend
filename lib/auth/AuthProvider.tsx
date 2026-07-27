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

  // Fetches /api/auth/me once and resolves `next(user | null)`. Shared by the
  // mount-time hydration effect and `refetchUser()` (called after a profile/
  // avatar PATCH so `profileCompleted`/`username`/`avatarUrl` update without a
  // full page reload — `user` here lives only in this provider's state, so
  // nothing else re-fetches it on our behalf).
  const load = useCallback(
    async (
      next: (user: AuthUser | null) => void,
      signal: AbortSignal,
    ): Promise<void> => {
      let retryTimer: ReturnType<typeof setTimeout> | undefined;
      let resolveRetry: ((retry: boolean) => void) | undefined;
      // /api/auth/me returns 503 on a transient Logto outage while preserving
      // the session cookies. Retry once before resolving to unauthenticated
      // so a brief blip doesn't flip the UI to logged-out.
      const waitBeforeRetry = () =>
        new Promise<boolean>((resolve) => {
          resolveRetry = resolve;
          retryTimer = setTimeout(() => resolve(!signal.aborted), 1500);
        });
      const cleanupRetry = () => {
        if (retryTimer) clearTimeout(retryTimer);
        resolveRetry?.(false);
      };
      signal.addEventListener("abort", cleanupRetry);

      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch("/api/auth/me", {
              credentials: "include",
              signal,
            });
            // 503 = transient Logto outage (cookies preserved server-side).
            if (res.status === 503 && attempt === 0) {
              if (await waitBeforeRetry()) continue;
              next(null);
              return;
            }
            const data = res.ok ? await res.json() : null;
            next((data?.user as AuthUser | null) ?? null);
            return;
          } catch {
            // Network blip / offline: retry once before giving up, but never
            // after an abort (timeout or unmount).
            if (attempt === 0 && !signal.aborted) {
              if (await waitBeforeRetry()) continue;
            }
            next(null);
            return;
          }
        }
        next(null);
      } finally {
        signal.removeEventListener("abort", cleanupRetry);
      }
    },
    [],
  );

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
    void load(finish, controller.signal);
    return () => {
      settled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [load]);

  // Re-fetches /api/auth/me and replaces `user` with the result. No retry-503
  // handling needed here (that's for the initial hydration race with a
  // transient Logto outage) — a plain single attempt is enough for an
  // on-demand refresh triggered right after a successful mutation.
  const refetchUser = useCallback(async (): Promise<void> => {
    const controller = new AbortController();
    await load((next) => setUser(next), controller.signal);
  }, [load]);

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
      refetchUser,
    }),
    [status, user, signIn, logout, refetchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
