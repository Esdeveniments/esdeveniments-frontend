"use client";

import type {
  AuthAdapter,
  AuthResult,
  AuthUser,
  AuthUnsubscribe,
  LoginCredentials,
  RegisterCredentials,
  PersistedAuthSession,
} from "types/auth";
import type { AuthenticatedUserDTO } from "types/api/auth";
import {
  parseAuthResponse,
  parseAuthUser,
  parseRefreshTokenResponse,
} from "@lib/validation/auth";

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

// Expire tokens 60s early to account for client/server clock skew
const EXPIRY_BUFFER_MS = 60_000;

// Refresh tokens 5 minutes before expiry
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;

const STORAGE_KEY = "auth-session";

function persistSession(session: PersistedAuthSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota exceeded)
  }
}

function loadPersistedSession(): PersistedAuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuthSession;
    if (!parsed.accessToken || !parsed.expiresAt || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPersistedSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createApiAdapter(): AuthAdapter {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let expiresAt: number | null = null;
  let currentUser: AuthUser | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(user: AuthUser | null) => void>();

  const notify = (user: AuthUser | null) => {
    for (const cb of listeners) cb(user);
  };

  function isTokenExpired(): boolean {
    if (!expiresAt) return true;
    return Date.now() >= (expiresAt - EXPIRY_BUFFER_MS);
  }

  function clearSession() {
    accessToken = null;
    refreshToken = null;
    expiresAt = null;
    currentUser = null;
    clearPersistedSession();
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (!expiresAt || !refreshToken) return;

    const msUntilRefresh = expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
    if (msUntilRefresh <= 0) {
      // Already past the refresh window, try immediately
      void attemptRefresh();
      return;
    }

    refreshTimer = setTimeout(() => {
      void attemptRefresh();
    }, msUntilRefresh);
  }

  async function attemptRefresh(): Promise<boolean> {
    if (!refreshToken) return false;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        clearSession();
        notify(null);
        return false;
      }

      const json = await res.json();
      const data = parseRefreshTokenResponse(json);
      if (!data) {
        clearSession();
        notify(null);
        return false;
      }

      accessToken = data.accessToken;
      refreshToken = data.refreshToken ?? refreshToken;
      const expiry = new Date(data.expiresAt).getTime();
      expiresAt = isNaN(expiry) ? 0 : expiry;

      if (currentUser) {
        persistSession({
          accessToken: data.accessToken,
          refreshToken,
          expiresAt: expiresAt,
          user: currentUser,
        });
      }

      scheduleRefresh();
      return true;
    } catch (error) {
      console.error("api-adapter refresh failed:", error);
      clearSession();
      notify(null);
      return false;
    }
  }

  async function fetchInternal(
    path: string,
    options?: RequestInit
  ): Promise<Response> {
    return fetch(path, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(10_000),
      headers: {
        ...options?.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  }

  return {
    supportedMethods: ["credentials"],

    async login(credentials: LoginCredentials): Promise<AuthResult> {
      try {
        const res = await fetchInternal("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          return {
            success: false,
            error: mapErrorCode(json.error ?? "unknown"),
          };
        }

        const data = parseAuthResponse(json);
        if (!data) {
          return { success: false, error: "unknown" };
        }

        accessToken = data.accessToken;
        refreshToken = data.refreshToken ?? null;
        const expiry = new Date(data.expiresAt).getTime();
        expiresAt = isNaN(expiry) ? 0 : expiry;
        currentUser = mapDtoToUser(data.user);

        persistSession({
          accessToken: data.accessToken,
          refreshToken,
          expiresAt,
          user: currentUser,
        });

        scheduleRefresh();
        notify(currentUser);

        return {
          success: true,
          user: currentUser,
          requiresVerification: !data.user.emailVerified,
        };
      } catch (error) {
        console.error("api-adapter login failed:", error);
        return { success: false, error: "network-error" };
      }
    },

    async register(credentials: RegisterCredentials): Promise<AuthResult> {
      try {
        const res = await fetchInternal("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            name: credentials.displayName ?? credentials.email.split("@")[0],
          }),
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
      clearSession();
      notify(null);
    },

    async getSession(): Promise<AuthUser | null> {
      // If we have a valid in-memory token, return the cached user
      if (accessToken && !isTokenExpired() && currentUser) {
        return currentUser;
      }

      // Try to restore from localStorage
      if (!accessToken) {
        const persisted = loadPersistedSession();
        if (persisted) {
          accessToken = persisted.accessToken;
          refreshToken = persisted.refreshToken;
          expiresAt = persisted.expiresAt;
          currentUser = persisted.user;
        }
      }

      // If token is expired, try refresh
      if (isTokenExpired() && refreshToken) {
        const refreshed = await attemptRefresh();
        if (!refreshed) return null;
      }

      if (!accessToken || isTokenExpired()) {
        clearSession();
        return null;
      }

      // Validate token against backend
      try {
        const res = await fetchInternal("/api/auth/me");
        if (!res.ok) {
          // Token invalid — try refresh before giving up
          if (refreshToken) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
              const retryRes = await fetchInternal("/api/auth/me");
              if (retryRes.ok) {
                const retryJson = await retryRes.json();
                const retryDto = parseAuthUser(retryJson);
                if (retryDto) {
                  currentUser = mapDtoToUser(retryDto);
                  notify(currentUser);
                  return currentUser;
                }
              }
            }
          }
          clearSession();
          return null;
        }

        const json = await res.json();
        const dto = parseAuthUser(json);
        if (!dto) {
          clearSession();
          return null;
        }
        currentUser = mapDtoToUser(dto);
        scheduleRefresh();
        notify(currentUser);
        return currentUser;
      } catch (error) {
        console.error("api-adapter getSession failed:", error);
        clearSession();
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
