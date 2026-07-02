import { z } from "zod";
import type { AuthenticatedUserDTO, UserPublicResponseDTO } from "types/api/user";

export const UserPublicResponseDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
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

export const AuthenticatedUserDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  username: z.string(),
  // .nullish() (not .optional()): the backend serializes unset fields as an
  // explicit `null`, not an omitted key — .optional() alone rejects that.
  pictureUrl: z.string().nullish().transform((v) => v ?? undefined),
  pictureSource: z
    .enum(["LOGTO", "CUSTOM"])
    .nullish()
    .transform((v) => v ?? undefined),
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
