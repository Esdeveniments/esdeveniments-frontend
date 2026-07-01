import { z } from "zod";
import type { UserPublicResponseDTO } from "types/api/user";

export const UserPublicResponseDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  pictureUrl: z.string().nullable().optional().default(null),
  createdAt: z.string().optional().default(""),
});

export function parseUserPublic(
  input: unknown
): UserPublicResponseDTO | null {
  const result = UserPublicResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseUserPublic: invalid user payload", result.error);
    return null;
  }
  return result.data as UserPublicResponseDTO;
}
