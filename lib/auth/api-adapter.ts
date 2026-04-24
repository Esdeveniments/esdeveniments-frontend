"use client";

import type {
  AuthAdapter,
  AuthResult,
  AuthUser,
  AuthUnsubscribe,
  AuthenticatedUserDTO,
  AuthResponseDTO,
  LoginCredentials,
  RegisterCredentials,
} from "types/auth";

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
    return Date.now() >= expiresAt;
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

        const data = json as AuthResponseDTO;
        accessToken = data.accessToken;
        expiresAt = new Date(data.expiresAt).getTime();
        currentUser = mapDtoToUser(data.user);
        notify(currentUser);

        return {
          success: true,
          user: currentUser,
          requiresVerification: !data.user.emailVerified,
        };
      } catch {
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
      } catch {
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

        const dto = (await res.json()) as AuthenticatedUserDTO;
        currentUser = mapDtoToUser(dto);
        return currentUser;
      } catch {
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
