import { getUserByUsernameExternal } from "./users-external";
import type { ProfileDetailResponseDTO } from "types/api/profile";

/**
 * @deprecated Use getUserByUsernameExternal directly.
 * Kept as a thin alias to limit blast radius during the user-model migration.
 */
export async function fetchProfileBySlugExternal(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}
