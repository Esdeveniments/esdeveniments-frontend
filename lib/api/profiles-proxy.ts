import { createKeyedCache } from "@lib/api/cache";
import { PROXY_TIMEOUT_MS } from "@lib/api/proxy-list";
import { isApiUrlConfigured } from "@utils/api-helpers";
import { userExistsExternal } from "./users-external";

// Usernames can be claimed or changed at any time, so a result is kept only as
// long as the page's own cache keeps a missing profile (cacheLife "minutes").
export const PROFILE_EXISTS_TTL_MS = 5 * 60 * 1000;

const { cache: profileExistsCache } = createKeyedCache<boolean>(
  PROFILE_EXISTS_TTL_MS,
  { maxEntries: 5000 },
);

/**
 * Whether Proxy should 404 a profile: true only when the backend says the
 * username doesn't exist. Errors, timeouts and a missing API URL return false,
 * so the page is served as before.
 */
export async function isProfileMissingForProxy(
  username: string,
): Promise<boolean> {
  if (!isApiUrlConfigured()) return false;
  const signal = AbortSignal.timeout(PROXY_TIMEOUT_MS);
  try {
    const exists = await profileExistsCache(username, (key) =>
      userExistsExternal(String(key), { signal }),
    );
    return !exists;
  } catch {
    return false;
  }
}
