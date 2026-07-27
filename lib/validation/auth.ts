import { z } from "zod";
import { usernameSchema } from "lib/validation/username";
import type { ProfileUpdateResponseDTO } from "types/api/user";

/**
 * Schema for PATCH /api/users/me/profile.
 * Backend returns 400 (Bad Request) for invalid format and 409 (Conflict)
 * if the username is already taken.
 */
export const profileUpdateSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "displayNameRequired")
    .max(80, "displayNameTooLong"),
  bio: z
    .string()
    .trim()
    .max(500, "bioTooLong")
    .nullable()
    .optional(),
});

/**
 * Response schema for PATCH /api/users/me/profile — mirrors the latest
 * GET /api/auth/me payload (2026-07-25 Logto handoff). `.passthrough()`
 * preserves any extra fields the backend might add later so we don't
 * throw on a forwards-compatible extension.
 */
export const profileUpdateResponseSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
    username: z.string().nullable(),
    bio: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    organizerVerified: z.boolean(),
    profileCompleted: z.boolean(),
    role: z.enum(["USER", "ADMIN"]),
    lastLoginAt: z.string(),
  })
  .passthrough();

export function parseProfileUpdateResponse(
  input: unknown,
): ProfileUpdateResponseDTO | null {
  const result = profileUpdateResponseSchema.safeParse(input);
  if (!result.success) {
    console.error(
      "parseProfileUpdateResponse: invalid payload",
      result.error,
    );
    return null;
  }
  return result.data;
}
