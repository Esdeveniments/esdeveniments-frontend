import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
import {
  parseAuthResponse,
  parseAuthUser,
  parseAuthMessageResponse,
  parseAuthError,
} from "@lib/validation/auth";
import type {
  AuthResponseDTO,
  AuthenticatedUserDTO,
  AuthMessageResponseDTO,
} from "types/auth";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// Auth endpoints are never cached — use no-store (fetchWithHmac default).

export async function loginExternal(
  email: string,
  password: string
): Promise<{
  data: AuthResponseDTO | null;
  error: string | null;
  status: number;
}> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, error: errorCode ?? "invalid-credentials", status: response.status };
    }

    const parsed = parseAuthResponse(json);
    if (!parsed) {
      console.error("loginExternal: invalid response shape", json);
      return { data: null, error: "unknown", status: 500 };
    }

    return { data: parsed as AuthResponseDTO, error: null, status: 200 };
  } catch (error) {
    console.error("loginExternal: failed", error);
    return { data: null, error: "network-error", status: 500 };
  }
}

export async function registerExternal(
  email: string,
  password: string,
  name: string
): Promise<{
  data: AuthMessageResponseDTO | null;
  error: string | null;
  status: number;
}> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, error: errorCode ?? "email-taken", status: response.status };
    }

    const parsed = parseAuthMessageResponse(json);
    return { data: parsed, error: null, status: 200 };
  } catch (error) {
    console.error("registerExternal: failed", error);
    return { data: null, error: "network-error", status: 500 };
  }
}

export async function getMeExternal(
  accessToken: string
): Promise<AuthenticatedUserDTO | null> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;

    const json = await response.json();
    return parseAuthUser(json) as AuthenticatedUserDTO | null;
  } catch (error) {
    console.error("getMeExternal: failed", error);
    return null;
  }
}

export async function forgotPasswordExternal(
  email: string
): Promise<{
  data: AuthMessageResponseDTO | null;
  error: string | null;
  status: number;
}> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/password/forgot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, error: errorCode ?? "unknown", status: response.status };
    }

    const parsed = parseAuthMessageResponse(json);
    return { data: parsed, error: null, status: 200 };
  } catch (error) {
    console.error("forgotPasswordExternal: failed", error);
    return { data: null, error: "network-error", status: 500 };
  }
}

export async function resetPasswordExternal(
  token: string,
  newPassword: string
): Promise<{
  data: AuthMessageResponseDTO | null;
  error: string | null;
  status: number;
}> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, error: errorCode ?? "unknown", status: response.status };
    }

    const parsed = parseAuthMessageResponse(json);
    return { data: parsed, error: null, status: 200 };
  } catch (error) {
    console.error("resetPasswordExternal: failed", error);
    return { data: null, error: "network-error", status: 500 };
  }
}

export async function confirmEmailExternal(
  token: string
): Promise<{
  data: AuthMessageResponseDTO | null;
  error: string | null;
  status: number;
}> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(
      `${apiUrl}/auth/verification/confirm?token=${encodeURIComponent(token)}`
    );

    const json = await response.json();

    if (!response.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, error: errorCode ?? "unknown", status: response.status };
    }

    const parsed = parseAuthMessageResponse(json);
    return { data: parsed, error: null, status: 200 };
  } catch (error) {
    console.error("confirmEmailExternal: failed", error);
    return { data: null, error: "network-error", status: 500 };
  }
}

export async function resendVerificationExternal(
  email: string
): Promise<{
  data: AuthMessageResponseDTO | null;
  error: string | null;
  status: number;
}> {
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/verification/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, error: errorCode ?? "unknown", status: response.status };
    }

    const parsed = parseAuthMessageResponse(json);
    return { data: parsed, error: null, status: 200 };
  } catch (error) {
    console.error("resendVerificationExternal: failed", error);
    return { data: null, error: "network-error", status: 500 };
  }
}
