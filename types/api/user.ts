import type { EventSummaryResponseDTO } from "types/api/event";
import type { AuthRole } from "../auth";

/**
 * Backend DTO: GET /api/users/{username} response.
 *
 * 2026-07-25 Logto-onboarding handoff: the backend moved to a richer shape
 * matching the OpenAPI spec at /v3/api-docs (displayName/bio/avatarUrl +
 * organizerVerified + eventCount + totalEventVisits). The legacy fields
 * (name/pictureUrl) are kept optional so the frontend still parses older
 * backend instances during the cut-over window. UI code should prefer the
 * new fields and fall back to the legacy ones.
 *
 * Note: the corresponding Zod schema (`UserPublicResponseDTOSchema`) uses
 * `.transform(v => v ?? undefined)` on each nullable string, so unset
 * fields normalize to `undefined` at runtime — the interface below
 * matches that runtime shape (no `| null`).
 */
export interface UserPublicResponseDTO {
  id: string;
  username: string;
  // ── New schema (2026-07-25 backend) ──────────────────────────────────────
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  organizerVerified?: boolean;
  eventCount?: number;
  totalEventVisits?: number;
  upcomingEventCount?: number;
  pastEventCount?: number;
  // ── Legacy schema (kept for back-compat) ─────────────────────────────────
  name?: string;
  pictureUrl?: string;
  createdAt?: string; // ISO date-time
}

/** Minimal user shape needed to build a public profile slug. */
export interface ProfileSlugUser {
  id: string;
  name: string;
  username: string;
  email?: string;
}

export type PictureSource = "LOGTO" | "CUSTOM";

/**
 * Backend DTO: GET /api/auth/me response (authenticated session profile).
 *
 * 2026-07-25 Logto-onboarding handoff: the backend migrated to the Swagger
 * spec at /v3/api-docs (displayName/avatarUrl/profileCompleted/emailVerified)
 * while keeping `name`/`pictureUrl` as legacy aliases. The frontend's
 * `AuthenticatedUserDTOSchema` mirrors both shapes via `.nullish()` +
 * `.transform(v => v ?? undefined)` so unset fields are normalized to
 * `undefined` at parse time — the interface below avoids the misleading
 * `string | null` (which would compile `=== null` checks that never match
 * at runtime). Consumers must use the
 * `displayName ?? name ?? username ?? user.name` fallback chain (see
 * `ProfileHeader.tsx` for the canonical example).
 */
export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  // New schema (2026-07-25)
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  organizerVerified?: boolean;
  profileCompleted?: boolean;
  emailVerified?: boolean;
  // Legacy / transitional (kept for back-compat during cut-over)
  name?: string;
  username?: string;
  pictureUrl?: string;
  pictureSource?: PictureSource;
  role?: AuthRole;
  lastLoginAt?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Additive shapes from the 2026-07-25 Logto-onboarding backend handoff.
// These are independent from the legacy DTOs above so existing UI consumers
// are unaffected; the new endpoints below use the new shapes exclusively.
// ──────────────────────────────────────────────────────────────────────────────

/** Request body for PATCH /api/users/me/profile. */
export interface ProfileUpdateRequestDTO {
  username: string;
  displayName: string;
  bio?: string | null;
}

/**
 * Response body from PATCH /api/users/me/profile — confirmed against the
 * real backend (2026-07-27) to be the same shape as `GET /api/users/{username}`
 * (`UserPublicResponseDTO`), NOT the `GET /api/auth/me` shape. An earlier,
 * untested assumption that it mirrored `AuthenticatedUserDTO` (expecting
 * `email`/`profileCompleted`/`role`/`lastLoginAt`) made every real profile
 * save fail with a 502 (Zod rejected the response as missing those fields).
 * Callers that need the fresh `profileCompleted` must re-fetch
 * `GET /api/auth/me` afterwards (see `useAuth().refetchUser()`).
 */
export type ProfileUpdateResponseDTO = UserPublicResponseDTO;

/** Response body from POST /api/users/me/avatar. */
export interface AvatarUploadResponseDTO {
  avatarUrl: string;
}

/**
 * Compact owner summary embedded in event detail responses.
 * The 2026-07-25 backend handoff drops `email` and `name` from the creator
 * payload (privacy / anti-spam). UI must not read those fields here; the
 * organizer badge is renderer-driven (organizerVerified === true).
 */
export interface OwnerSummaryDTO {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  organizerVerified: boolean;
}

/**
 * Public profile shape from GET /api/users/{username}. Backend returns 404
 * for incomplete / temporary (auto `user-*`) profiles.
 */
export interface UserPublicProfileDTO {
  id: string;
  displayName: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  organizerVerified: boolean;
  eventCount: number;
  totalEventVisits: number;
  createdAt: string;
}

/** Public events feed for a username; carries isFavorite when authenticated. */
export type PublicUserEventDTO = EventSummaryResponseDTO & {
  isFavorite?: boolean;
};
