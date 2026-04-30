"use client";

import type {
  AuthAdapter,
  AuthResult,
  AuthUser,
  AuthUnsubscribe,
  LoginCredentials,
  RegisterCredentials,
} from "types/auth";
import type { AuthenticatedUserDTO } from "types/api/auth";
import { parseBackendDateAsUtcMs } from "@utils/date-helpers";

/** Lightweight runtime guard — no Zod in the browser bundle */
function parseAuthUser(data: unknown): AuthenticatedUserDTO | null {
  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as Record<string, unknown>).id !== "string" ||
    typeof (data as Record<string, unknown>).email !== "string" ||
    typeof (data as Record<string, unknown>).name !== "string" ||
    typeof (data as Record<string, unknown>).role !== "string" ||
    typeof (data as Record<string, unknown>).emailVerified !== "boolean"
  )
    return null;
  return data as AuthenticatedUserDTO;
}

/** Map backend DTO to frontend AuthUser */
function mapDtoToUser(dto: AuthenticatedUserDTO): AuthUser {
  return {
    id: dto.id,
    email: dto.email,
    displayName: dto.name,
    role: dto.role,
    emailVerified: dto.emailVerified,
  };
}

/** Map backend error strings to AuthErrorCode */
function mapErrorCode(
  error: string
): AuthResult["error"] {
  const errorMap: Record<string, AuthResult["error"]> = {
    "invalid-credentials": "invalid-credentials",
    "email-taken": "email-taken",
    "weak-password": "weak-password",
    "email-not-verified": "email-not-verified",
    "account-locked": "account-locked",
    "rate-limited": "rate-limited",
    "network-error": "network-error",
  };
  return errorMap[error] ?? "unknown";
}

// Refresh tokens 5 minutes before expiry
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;

/**
 * Cookie-based auth adapter.
 *
 * Tokens are stored in HttpOnly cookies (set by server API routes).
 * The client never sees or handles raw tokens — it only receives user data.
 * Browser sends cookies automatically with same-origin requests.
 */
export function createApiAdapter(): AuthAdapter {
  let currentUser: AuthUser | null = null;
  let expiresAt: number | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshPromise: Promise<boolean> | null = null;
  let loggedOut = false;
  const listeners = new Set<(user: AuthUser | null) => void>();

  const notify = (user: AuthUser | null) => {
    for (const cb of listeners) cb(user);
  };

  function clearSession() {
    currentUser = null;
    expiresAt = null;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (!expiresAt) return;

    const msUntilRefresh = expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
    if (msUntilRefresh <= 0) {
      void attemptRefresh();
      return;
    }

    refreshTimer = setTimeout(() => {
      void attemptRefresh();
    }, msUntilRefresh);
  }

  async function attemptRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts (e.g., timer + 401 retry race)
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        // Cookies are sent automatically — no body needed
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          signal: AbortSignal.timeout(10_000),
        });

        // If logout happened while refresh was in-flight, discard result
        if (loggedOut) return false;

        if (!res.ok) {
          clearSession();
          notify(null);
          return false;
        }

        const json = await res.json();
        expiresAt = parseBackendDateAsUtcMs(json.expiresAt);

        scheduleRefresh();
        return true;
      } catch (error) {
        console.error("api-adapter refresh failed:", error);
        clearSession();
        notify(null);
        return false;
      }
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  return {
    supportedMethods: ["credentials"],

    async login(credentials: LoginCredentials): Promise<AuthResult> {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        const json = await res.json();

        if (!res.ok) {
          return {
            success: false,
            error: mapErrorCode(json.error ?? "unknown"),
          };
        }

        // Server sets HttpOnly cookies — we only get user data + expiresAt
        const dto = parseAuthUser(json.user);
        if (!dto) {
          return { success: false, error: "unknown" };
        }

        loggedOut = false;
        expiresAt = parseBackendDateAsUtcMs(json.expiresAt);
        currentUser = mapDtoToUser(dto);

        scheduleRefresh();
        notify(currentUser);

        return {
          success: true,
          user: currentUser,
          requiresVerification: !dto.emailVerified,
        };
      } catch (error) {
        console.error("api-adapter login failed:", error);
        return { success: false, error: "network-error" };
      }
    },

    async register(credentials: RegisterCredentials): Promise<AuthResult> {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            name: credentials.displayName ?? credentials.email.split("@")[0],
          }),
          signal: AbortSignal.timeout(10_000),
        });

        const json = await res.json();

        if (!res.ok) {
          return {
            success: false,
            error: mapErrorCode(json.error ?? "unknown"),
          };
        }

        return {
          success: true,
          message: json.message,
          requiresVerification: true,
        };
      } catch (error) {
        console.error("api-adapter register failed:", error);
        return { success: false, error: "network-error" };
      }
    },

    async logout(): Promise<void> {
      loggedOut = true;
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        console.error("api-adapter logout failed:", error);
      }
      clearSession();
      notify(null);
    },

    async getSession(): Promise<AuthUser | null> {
      // Return cached user if we have one and haven't expired
      if (currentUser && expiresAt && Date.now() < expiresAt) {
        return currentUser;
      }

      // Ask server — cookies are sent automatically
      try {
        const res = await fetch("/api/auth/me", {
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          // Token expired — try refresh (cookie-based)
          if (res.status === 401) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
              // Retry with new cookies
              const retryRes = await fetch("/api/auth/me", {
                signal: AbortSignal.timeout(10_000),
              });
              if (retryRes.ok) {
                const retryJson = await retryRes.json();
                const retryDto = parseAuthUser(retryJson);
                if (retryDto) {
                  currentUser = mapDtoToUser(retryDto);
                  // expiresAt and scheduleRefresh already handled by attemptRefresh()
                  notify(currentUser);
                  return currentUser;
                }
              }
              // Retry succeeded HTTP-wise but parsing failed
              clearSession();
              notify(null);
              return null;
            }
            // attemptRefresh already called clearSession + notify(null)
            return null;
          }
          clearSession();
          notify(null);
          return null;
        }

        const json = await res.json();
        const dto = parseAuthUser(json);
        if (!dto) {
          clearSession();
          notify(null);
          return null;
        }
        currentUser = mapDtoToUser(dto);
        // Note: proactive refresh not scheduled here — /api/auth/me doesn't
        // return expiresAt. Reactive 401-based refresh handles token renewal.
        notify(currentUser);
        return currentUser;
      } catch (error) {
        console.error("api-adapter getSession failed:", error);
        clearSession();
        notify(null);
        return null;
      }
    },

    onAuthStateChange(
      callback: (user: AuthUser | null) => void
    ): AuthUnsubscribe {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
