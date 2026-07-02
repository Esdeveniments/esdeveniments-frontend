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
  pictureUrl: z.string().optional(),
  pictureSource: z.enum(["LOGTO", "CUSTOM"]).optional(),
  role: z.enum(["USER", "ADMIN", "ORGANIZATION"]).optional(),
  lastLoginAt: z.string().optional(),
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
