import { z } from "zod";
import type { AuthenticatedUserDTO, UserPublicResponseDTO } from "types/api/user";

// Accept BOTH the new schema (2026-07-25 backend handoff) and the legacy
// `name/pictureUrl` shape so a partial cut-over doesn't blow up the parser.
// `name/pictureUrl` are now optional to match the new schema where the
// backend sends `displayName/avatarUrl`.
export const UserPublicResponseDTOSchema = z.object({
  id: z.string(),
  username: z.string(),
  // New schema (Swagger /v3/api-docs)
  displayName: z.string().nullish().transform((v) => v ?? undefined),
  bio: z.string().nullish().transform((v) => v ?? undefined),
  avatarUrl: z.string().nullish().transform((v) => v ?? undefined),
  organizerVerified: z.boolean().nullish().transform((v) => v ?? undefined),
  eventCount: z.number().nullish().transform((v) => v ?? undefined),
  totalEventVisits: z.number().nullish().transform((v) => v ?? undefined),
  // Legacy / transitional fields — relaxed to optional/nullish.
  name: z.string().nullish().transform((v) => v ?? undefined),
  // .nullish() because the backend serializes unset fields as explicit `null`
  // rather than omitting the key.
  pictureUrl: z.string().nullish().transform((v) => v ?? undefined),
  createdAt: z.string().nullish().transform((v) => v ?? undefined),
});

export function parseUserPublic(
  input: unknown
): UserPublicResponseDTO | null {
  const result = UserPublicResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseUserPublic: invalid payload", result.error);
    return null;
  }
  return result.data;
}

// Same dual-shape handling as UserPublicResponseDTOSchema: the Logto
// onboarding handoff (2026-07-25) moves the backend to displayName/avatarUrl/
// profileCompleted/emailVerified while keeping name/pictureUrl optional for
// back-compat. The frontend's /api/auth/me enrichment falls back to a
// Logto-only user if this schema rejects the backend response — but we'd
// rather let the parser accept the new shape so enrichWithBackendProfile
// can layer backend UUID + role + profileCompleted onto the AuthUser.
export const AuthenticatedUserDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  // New schema
  displayName: z.string().nullish().transform((v) => v ?? undefined),
  // Legacy "name" — relaxed to optional/nullish for the same reason.
  name: z.string().nullish().transform((v) => v ?? undefined),
  username: z.string().nullish().transform((v) => v ?? undefined),
  bio: z.string().nullish().transform((v) => v ?? undefined),
  // New schema
  avatarUrl: z.string().nullish().transform((v) => v ?? undefined),
  // Legacy "pictureUrl" — relaxed to optional/nullish.
  pictureUrl: z.string().nullish().transform((v) => v ?? undefined),
  pictureSource: z
    .enum(["LOGTO", "CUSTOM"])
    .nullish()
    .transform((v) => v ?? undefined),
  organizerVerified: z.boolean().nullish().transform((v) => v ?? undefined),
  profileCompleted: z.boolean().nullish().transform((v) => v ?? undefined),
  emailVerified: z.boolean().nullish().transform((v) => v ?? undefined),
  role: z
    .enum(["USER", "ADMIN", "ORGANIZATION"])
    .nullish()
    .transform((v) => v ?? undefined),
  lastLoginAt: z.string().nullish().transform((v) => v ?? undefined),
});

export function parseAuthenticatedUser(
  input: unknown
): AuthenticatedUserDTO | null {
  const result = AuthenticatedUserDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseAuthenticatedUser: invalid payload", result.error);
    return null;
  }
  return result.data;
}
