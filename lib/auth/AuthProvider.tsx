"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
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
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    adapter.getSession().then((sessionUser) => {
      setUser(sessionUser);
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
    await adapter.logout();
    setUser(null);
    setError(null);
  }, [adapter]);

  const status = !hydrated
    ? "loading" as const
    : user
      ? "authenticated" as const
      : "unauthenticated" as const;

  const value: AuthContextValue = {
    status,
    user,
    error,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    supportedMethods: adapter.supportedMethods,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
