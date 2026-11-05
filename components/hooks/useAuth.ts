import { useContext, useMemo } from "react";
import { AuthContext } from "@lib/auth/AuthProvider";
import { useExternalStore } from "@lib/context/external-store";
import type { AuthContextValue } from "types/auth";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  const { session, signIn, logout, refetchUser } = context;
  const { user, hydrated } = useExternalStore(session);
  return useMemo(() => {
    const status = !hydrated
      ? "loading"
      : user
        ? "authenticated"
        : "unauthenticated";
    return {
      status,
      user,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      signIn,
      logout,
      refetchUser,
    };
  }, [hydrated, user, signIn, logout, refetchUser]);
}
