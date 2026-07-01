import { fetchWithHmac } from "./fetch-wrapper";
import { parseUserPublic } from "@lib/validation/user";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import type { UserPublicResponseDTO } from "types/api/user";

export async function getUserByUsernameExternal(
  username: string
): Promise<UserPublicResponseDTO | null> {
  if (!username || !username.trim()) return null;
  // Return null (no fetch) when the backend URL is genuinely unconfigured.
  // getApiUrl() falls back to a hardcoded default, so guarding on its result
  // is dead code and would fire a real request against the default host.
  if (!isApiUrlConfigured()) return null;
  const apiUrl = getApiUrl();

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
