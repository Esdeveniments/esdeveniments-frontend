import "server-only";
import { createHash } from "node:crypto";
import { fetchWithHmac } from "./fetch-wrapper";
import { parseAuthenticatedUser, parseUserPublic } from "@lib/validation/user";
import { parsePagedEvents } from "@lib/validation/event";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import type {
  AuthenticatedUserDTO,
  ProfileUpdateRequestDTO,
  ProfileUpdateResponseDTO,
  UserPublicResponseDTO,
} from "types/api/user";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";

// Strip control characters (incl. newlines, C1 controls, and the Unicode
// line/paragraph separators some log viewers and JS engines also treat as
// line terminators) before logging an upstream error body, so a
// malicious/broken backend response can't inject fake log lines into an
// aggregator that parses on line breaks. Truncated to the same 200-char
// bound `decodeSafeJwtClaims` below uses for logged summaries.
function sanitizeLoggedBody(body: string): string {
  return body.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, " ").slice(0, 200);
}

/**
 * Authenticated session profile: GET /api/auth/me. Backend-owned fields
 * (avatarUrl/pictureSource/role/lastLoginAt) that the Logto id_token can't
 * carry — the id_token has no concept of an in-app avatar upload or login
 * audit trail.
 *
 * Throws with `.status` on non-OK so callers can distinguish:
 *   - 4xx (Bearer rejected — `profileEnrichmentFailed = "auth"`): the backend
 *     doesn't trust our access_token, so future Bearer calls will also 401
 *     until the wiring is fixed.
 *   - 5xx / network (transient): the session IS valid; we should keep the
 *     id_token-only user rather than visually-logging the user out.
 *   - 2xx: return the parsed AuthenticatedUserDTO, or null on Zod mismatch.
 *
 * Also decodes and logs the JWT payload (`iss`/`aud`/`exp`/`sub`) so a
 * future log capture reveals the audience/issuer mismatch that causes
 * the auth-rejection regression without redacting PII (email/name/picture
 * are stripped before logging).
 */
export async function getAuthenticatedUserExternal(
  accessToken: string
): Promise<AuthenticatedUserDTO | null> {
  if (!accessToken) return null;
  if (!isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  // Decode the access_token payload (no signature verification — that's the
  // backend's job) and log iss/aud/exp/sub so a future ``getAuthenticatedUserExternal``
  // crash dump exposes the audience/issuer that the backend probably
  // doesn't trust. Email/name/picture claims are stripped before logging.
  const safeClaims = decodeSafeJwtClaims(accessToken);

  try {
    const response = await fetchWithHmac(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable>");
      // 2026-07-26 round-10 (mirror of createEvent / uploadEventImage): surface
      // the WWW-Authenticate header so Spring's resource-server rejection
      // reason (RFC 6750) is one-grep root-caused across all entry points.
      // A bare `Bearer resource_metadata="..."` (no `error="..."` directive)
      // indicates Spring didn't even attempt JWT decode — same shape as the
      // shell-curl-with-no-Authorization response, which strongly suggests the
      // request never reached the resource-server's bearer-token filter.
      console.error(
        `getAuthenticatedUserExternal: HTTP ${response.status} \u2014 body=${body.slice(0, 200)} \u2014 www-authenticate=${response.headers.get("www-authenticate") ?? "<none>"} \u2014 access_token=${safeClaims}`,
      );
      const err = Object.assign(
        new Error(
          `getAuthenticatedUserExternal: HTTP ${response.status}`,
        ),
        { status: response.status },
      );
      throw err;
    }
    return parseAuthenticatedUser(await response.json());
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error(
      `getAuthenticatedUserExternal: failed (network/parse) \u2014 access_token=${safeClaims}`,
      error,
    );
    return null;
  }
}

/**
 * Decode the JWT payload of an access_token without verifying the signature.
 * Returns a redacted summary suitable for inclusion in server logs:
 * `{iss, aud, exp, scope, sub}` — email/name/picture claims are stripped
 * because the production code has them elsewhere (AuthProvider) and a
 * redacted summary is enough to diagnose `aud`/`iss`/`exp`/`scope` mismatches.
 *
 * `scope` is included (capped at 200 chars) because Logto issues the
 * granted-permissions list as a space-separated string. Without it, the
 * 2026-07-26 silent "GET /api/auth/me works, POST /api/events 401" pattern
 * is indistinguishable between "wrong audience" and "missing resource
 * scope" — the two are different fixes (one is a JWKS/aud config, the other
 * is `LOGTO_API_SCOPES` not set). The string is not PII — it's the same
 * scope list the `scope=` query parameter carries in the OAuth flow.
 *
 * `sub` is the user's stable Logto subject identifier — unlike scope, it
 * IS a persistent, per-user value that could sit in log aggregators
 * indefinitely, so it's hashed rather than logged raw. The truncated hash
 * still lets an engineer correlate multiple log lines back to the same
 * session/user without exposing the actual identifier.
 */
export function decodeSafeJwtClaims(accessToken: string): string {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return "<unparseable-short-token>";
    const padded = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), "=");
    const raw = Buffer.from(padded, "base64").toString("utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Logto's `scope` is a space-separated string per RFC 6749 §3.3. Cap to
    // 200 chars so a misconfigured tenant with thousands of scopes can't
    // bloat log lines; the cap is well above any plausible real scope set.
    const rawScope = typeof parsed.scope === "string" ? parsed.scope : undefined;
    const summary: Record<string, unknown> = {
      iss: parsed.iss,
      aud: parsed.aud,
      exp: parsed.exp,
      scope: rawScope ? rawScope.slice(0, 200) : undefined,
      sub:
        typeof parsed.sub === "string"
          ? createHash("sha256").update(parsed.sub).digest("hex").slice(0, 12)
          : undefined,
    };
    return JSON.stringify(summary);
  } catch {
    return "<unparseable-jwt>";
  }
}

export async function getUserByUsernameExternal(
  username: string
): Promise<UserPublicResponseDTO | null> {
  if (!username || !username.trim()) return null;
  // Return null (no fetch) when the backend URL is genuinely unconfigured.
  // getApiUrl() falls back to a hardcoded default, so guarding on its result
  // is dead code and would fire a real request against the default host.
  if (!isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  return fetchJsonWithFallback(
    `${apiUrl}/users/${encodeURIComponent(username)}`,
    parseUserPublic,
    null,
    "getUserByUsernameExternal",
  );
}

/**
 * Shared shape for the "silent fallback" backend calls (public reads where a
 * 404/error should render as empty state, not surface as an error): fetch,
 * treat 404 as the fallback (the common, expected case, not an error), log +
 * fallback on any other non-OK or network failure, parse on success and fall
 * back if the payload doesn't validate.
 *
 * Anything other than 404 also falls back silently so callers render a clean
 * empty/not-found state instead of crashing, but a bare status number here
 * was indistinguishable from a genuine 404 in logs — a real "works locally,
 * 404s on staging" report (2026-07-30) took a manual server-log correlation
 * to rule out an auth/config failure masked as "doesn't exist" (it turned
 * out to be a genuinely missing row, but the log line gave no way to tell
 * without digging). Read the body and tag the log line so it's greppable as
 * a non-404 upstream failure going forward.
 */
async function fetchJsonWithFallback<T>(
  url: string,
  parse: (json: unknown) => T | null,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const response = await fetchWithHmac(url);
    if (response.status === 404) return fallback;
    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable>");
      console.error(
        `${label}: non-404 upstream failure HTTP ${response.status} — body=${sanitizeLoggedBody(body)}`
      );
      return fallback;
    }
    return parse(await response.json()) ?? fallback;
  } catch (error) {
    console.error(`${label}: failed`, error);
    return fallback;
  }
}

/**
 * Patch the signed-in user's profile (username/displayName/bio).
 * Returns the updated ProfileUpdateResponseDTO — confirmed (2026-07-27)
 * against the real backend to be the same shape `GET /api/users/{username}`
 * returns, so it's parsed with `parseUserPublic`. It does NOT carry
 * `profileCompleted`/`role`/`lastLoginAt`; callers that need the fresh
 * `profileCompleted` must re-fetch `GET /api/auth/me` afterwards. Backend
 * returns 409 (taken) for collision, 400 for validation — we surface the
 * real status via re-throw so the route handler can map it correctly
 * without going through Zod parse.
 */
export async function patchMeProfileExternal(
  body: ProfileUpdateRequestDTO,
  accessToken: string,
): Promise<ProfileUpdateResponseDTO | null> {
  if (!accessToken || !isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  try {
    const response = await fetchWithHmac(`${apiUrl}/users/me/profile`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      skipBodySigning: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      // Keep the real status so callers can distinguish 409 (taken) from
      // validation (400) and auth (403). The route handler maps to the
      // user-visible status without going through Zod parse.
      const err = Object.assign(
        new Error(
          `patchMeProfileExternal: HTTP ${response.status} — ${text.slice(0, 200)}`,
        ),
        { status: response.status },
      );
      throw err;
    }
    return parseUserPublic(await response.json());
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error("patchMeProfileExternal: failed", error);
    return null;
  }
}

/**
 * Upload the signed-in user's avatar (multipart/form-data, field `avatarFile`).
 * Returns `{ avatarUrl }` per backend handoff. Mirrors `uploadEventImage`:
 * 2 MB cap held at the route; the wrapper forwards whatever File the caller
 * passes and lets fetchWithHmac HMAC-sign over an empty body for FormData.
 */
export async function uploadUserAvatarExternal(
  file: File,
  accessToken: string,
): Promise<{ avatarUrl: string } | null> {
  if (!file || !accessToken || !isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

  try {
    const formData = new FormData();
    formData.append("avatarFile", file);
    const response = await fetchWithHmac(`${apiUrl}/users/me/avatar`, {
      method: "POST",
      // fetch-wrapper ignores FormData bodies for signing (multipart bodies
      // can't be re-signed from a server-cloned stream). Backend uses HMAC
      // over the path+method only.
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `uploadUserAvatarExternal: HTTP ${response.status} — ${text.slice(0, 200)}`,
      );
      const err = Object.assign(
        new Error(`uploadUserAvatarExternal: HTTP ${response.status}`),
        { status: response.status },
      );
      throw err;
    }
    const json: unknown = await response.json().catch(() => null);
    const avatarUrl =
      json && typeof json === "object" && typeof (json as { avatarUrl?: unknown }).avatarUrl === "string"
        ? (json as { avatarUrl: string }).avatarUrl
        : null;
    return avatarUrl ? { avatarUrl } : null;
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error("uploadUserAvatarExternal: failed", error);
    return null;
  }
}

/** DELETE /api/users/me/avatar — clear the avatar.
 *  Throws with `.status` on non-ok so the route can map backend codes
 *  faithfully (a 401/403 stays 401/403 instead of being squashed to 502). */
export async function deleteUserAvatarExternal(
  accessToken: string,
): Promise<boolean> {
  if (!accessToken || !isApiUrlConfigured()) return false;
  const apiUrl = getApiUrl();
  try {
    const response = await fetchWithHmac(`${apiUrl}/users/me/avatar`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      skipBodySigning: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = Object.assign(
        new Error(
          `deleteUserAvatarExternal: HTTP ${response.status} — ${text.slice(0, 200)}`,
        ),
        { status: response.status },
      );
      throw err;
    }
    return true;
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    console.error("deleteUserAvatarExternal: failed", error);
    return false;
  }
}

/**
 * Public listing of a user's events: GET /api/users/{username}/events.
 * Same paged shape as /events; the endpoint accepts page, size, and an
 * optional status ("upcoming" | "past") that scopes the profile's Propers /
 * Passats tabs. Omitting status keeps today's upcoming-only behaviour.
 * Default size is 20 — matches the backend handoff and the
 * /[place] listing page size, so a public profile with many events
 * renders at the same density as the home page.
 * Returns an empty page on error so the profile renders "no events" rather
 * than crashing.
 */
export async function getUserEventsExternal(
  username: string,
  page = 0,
  size = 20,
  status?: "upcoming" | "past",
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> {
  const empty: PagedResponseDTO<EventSummaryResponseDTO> = {
    content: [],
    currentPage: page,
    pageSize: size,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };
  const trimmed = username?.trim();
  if (!trimmed) return empty;
  // Return an empty page (no fetch) when the backend URL is unconfigured —
  // getApiUrl() falls back to a default host, so guarding on it is dead code.
  if (!isApiUrlConfigured()) return empty;
  const apiUrl = getApiUrl();

  // No `next: { revalidate }` here — external wrappers must stay no-store
  // (repo cost rule). Matches getUserByUsernameExternal on the same page.
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) qs.set("status", status);
  return fetchJsonWithFallback(
    `${apiUrl}/users/${encodeURIComponent(trimmed)}/events?${qs.toString()}`,
    parsePagedEvents,
    empty,
    "getUserEventsExternal",
  );
}
