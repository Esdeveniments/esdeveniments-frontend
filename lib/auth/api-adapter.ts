"use client";

import type {
  AuthAdapter,
  AuthResult,
  AuthUser,
  AuthUnsubscribe,
  LoginCredentials,
  RegisterCredentials,
} from "types/auth";
import type {
  AuthenticatedUserDTO,
  AuthResponseDTO,
} from "types/api/auth";

// Lightweight runtime guards — Zod validation happens server-side in API routes.
// Keeping Zod out of the client bundle saves ~60KB.

function isAuthResponseDTO(v: unknown): v is AuthResponseDTO {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.accessToken === "string" &&
    typeof o.expiresAt === "string" &&
    isAuthenticatedUserDTO(o.user)
  );
}

function isAuthenticatedUserDTO(v: unknown): v is AuthenticatedUserDTO {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.email === "string" &&
    typeof o.name === "string" &&
    typeof o.emailVerified === "boolean"
  );
}

/** Map backend DTO to frontend AuthUser */
function mapDtoToUser(dto: AuthenticatedUserDTO): AuthUser {
  return {
    id: String(dto.id),
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

export function createApiAdapter(): AuthAdapter {
  let accessToken: string | null = null;
  let expiresAt: number | null = null;
  let currentUser: AuthUser | null = null;
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
    expiresAt = null;
    currentUser = null;
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

        if (!isAuthResponseDTO(json)) {
          return { success: false, error: "unknown" };
        }
        const data = json;

        accessToken = data.accessToken;
        const expiry = new Date(data.expiresAt).getTime();
        expiresAt = isNaN(expiry) ? 0 : expiry;
        currentUser = mapDtoToUser(data.user);
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
      if (!accessToken || isTokenExpired()) {
        clearSession();
        return null;
      }

      if (currentUser) return currentUser;

      try {
        const res = await fetchInternal("/api/auth/me");
        if (!res.ok) {
          clearSession();
          return null;
        }

        const json = await res.json();
        if (!isAuthenticatedUserDTO(json)) {
          clearSession();
          return null;
        }
        currentUser = mapDtoToUser(json);
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
