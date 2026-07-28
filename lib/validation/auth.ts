import { z } from "zod";
import { usernameSchema } from "lib/validation/username";

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

// The PATCH response is parsed via `parseUserPublic` (lib/validation/user.ts)
// — see the ProfileUpdateResponseDTO doc comment in types/api/user.ts for why
// a separate, GET-/api/auth/me-shaped schema here was wrong.
