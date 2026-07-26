import type { EventSummaryResponseDTO } from "types/api/event";
import type { AuthRole } from "../auth";

/** Backend DTO: GET /api/users/{username} response.
 *  `pictureUrl` and `createdAt` are sent by the backend but were previously
 *  stripped by the Zod schema — now parsed and forwarded to the profile UI. */
export interface UserPublicResponseDTO {
  id: string;
  name: string;
  username: string;
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

/** Backend DTO: GET /api/auth/me response (authenticated session profile). */
export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  name: string;
  username: string;
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

export type BackendUserRole = "USER" | "ADMIN";

/** Request body for PATCH /api/users/me/profile. */
export interface ProfileUpdateRequestDTO {
  username: string;
  displayName: string;
  bio?: string | null;
}

/** Response body from PATCH /api/users/me/profile and the latest GET /api/auth/me. */
export interface ProfileUpdateResponseDTO {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  organizerVerified: boolean;
  /** True when username + displayName are present and the user can publish. */
  profileCompleted: boolean;
  role: BackendUserRole;
  lastLoginAt: string;
}

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
