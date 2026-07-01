import { z } from "zod";
import type { UserPublicResponseDTO } from "types/api/user";

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
