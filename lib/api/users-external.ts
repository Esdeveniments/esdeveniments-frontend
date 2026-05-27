import { fetchWithHmac } from "./fetch-wrapper";
import { parseUserPublic } from "@lib/validation/user";
import { getApiUrl } from "@utils/api-helpers";
import type { UserPublicResponseDTO } from "types/api/user";

export async function getUserByUsernameExternal(
  username: string
): Promise<UserPublicResponseDTO | null> {
  if (!username.trim()) return null;
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;

  try {
    const response = await fetchWithHmac(
      `${apiUrl}/users/${encodeURIComponent(username)}`
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`getUserByUsernameExternal: HTTP ${response.status}`);
      return null;
    }
    return parseUserPublic(await response.json());
  } catch (error) {
    console.error("getUserByUsernameExternal: failed", error);
    return null;
  }
}
