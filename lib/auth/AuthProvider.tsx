"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { noopAdapter } from "./adapter";
import type {
  AuthAdapter,
  AuthContextValue,
  AuthErrorCode,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  AuthResult,
} from "types/auth";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  adapter = noopAdapter,
  children,
}: {
  adapter?: AuthAdapter;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    adapter
      .getSession()
      .then((sessionUser) => {
        setUser(sessionUser);
      })
      .catch((err) => {
        console.error("AuthProvider: getSession failed", err);
      })
      .finally(() => {
        setHydrated(true);
      });

    const unsubscribe = adapter.onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });

    return unsubscribe;
  }, [adapter]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResult> => {
      setError(null);
      const result = await adapter.login(credentials);
      if (result.success && result.user) {
        setUser(result.user);
        // Migrate any guest-cookie favorites to the user's server-side list
        // before login resolves, so /preferits (server-rendered) and any
        // mounted FavoriteButtons (SWR-backed) see the synced state on the
        // very next render — no empty-list flash. The endpoint short-circuits
        // in ~50ms when the cookie is empty, so the cost is only paid by
        // users who actually saved favorites as a guest. Errors are caught
        // so a flaky migrate never blocks a successful login.
        try {
          const res = await fetch("/api/favorites/migrate", {
            method: "POST",
            signal: AbortSignal.timeout(10_000),
          });
          if (res.ok) {
            // Also refresh the shared favorites SWR cache for any
            // already-mounted FavoriteButton.
            const { mutate } = await import("swr");
            await mutate("favorites:list");
          }
        } catch {
          // Best-effort: leftover cookie favorites are migrated on the next
          // login (the route re-queues only failed slugs).
        }
      } else if (result.error) {
        setError(result.error);
      }
      return result;
    },
    [adapter]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<AuthResult> => {
      setError(null);
      const result = await adapter.register(credentials);
      if (result.success && result.user) {
        setUser(result.user);
      } else if (result.error) {
        setError(result.error);
      }
      return result;
    },
    [adapter]
  );

  const logout = useCallback(async () => {
    try {
      await adapter.logout();
    } catch (err) {
      console.error("AuthProvider: logout failed", err);
    }
    setUser(null);
    setError(null);
  }, [adapter]);

  const status = !hydrated
    ? "loading" as const
    : user
      ? "authenticated" as const
      : "unauthenticated" as const;

  const value: AuthContextValue = useMemo(
    () => ({
      status,
      user,
      error,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      supportedMethods: adapter.supportedMethods,
      login,
      register,
      logout,
    }),
    [status, user, error, adapter.supportedMethods, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
