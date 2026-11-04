import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getUserByUsernameExternal, getUserEventsExternal } from "./users-external";
import { userTag } from "@lib/cache/tags";
import {
  getInternalApiUrl,
  getVercelProtectionBypassHeaders,
} from "@utils/api-helpers";
import { parseUserPublic } from "@lib/validation/user";
import type { InternalOriginOptions } from "types/api/internal";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileByUsernameInternal(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}

export const fetchProfileBySlug = cache(fetchProfileByUsernameInternal);
export const fetchUserByUsername = cache(fetchProfileByUsernameInternal);

// Internal-route reader for profile pages. Fetches via the app's own
// /api/users/[username] route using plain fetch() (no fetchWithHmac → no
// connection()) so it is safe to call from inside a "use cache" boundary.
// The internal route handles HMAC signing server-side. Mirrors
// fetchEventBySlug / fetchNewsBySlug.
export async function fetchUserBySlug(
  username: string,
  options: InternalOriginOptions = {},
): Promise<ProfileDetailResponseDTO | null> {
  try {
    const url = await getInternalApiUrl(
      `/api/users/${encodeURIComponent(username)}`,
      { preferConfiguredOrigin: options.preferConfiguredOrigin },
    );
    const response = await fetch(url, {
      headers: getVercelProtectionBypassHeaders(),
      next: { revalidate: 300, tags: [userTag(username)] },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return parseUserPublic(await response.json());
  } catch (e) {
    console.error("Error fetching user by slug (internal):", e);
    // Transient failure: re-throw for cached metadata readers so the error is
    // not cached as a null (a real 404 returned above, which is fine to cache).
    if (options.throwOnError) {
      throw e instanceof Error ? e : new Error(String(e));
    }
    return null;
  }
}

// Cached reader used by generateMetadata and the page Suspense gate.
// "use cache" is required under cacheComponents so the profile can be
// prerendered outside a Suspense boundary without "Uncached data was accessed
// outside of <Suspense>". fetchUserBySlug uses plain fetch() (no connection()),
// so it is safe inside this "use cache" scope.
export async function getUserByUsernameCached(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  "use cache";
  cacheTag(userTag(username));
  const user = await fetchUserBySlug(username, {
    preferConfiguredOrigin: true,
    throwOnError: true,
  });
  if (!user) {
    cacheLife("minutes");
    return null;
  }
  cacheLife("hours");
  return user;
}

// Request-level dedupe facade so components fetch a user's events through
// lib/api rather than importing the *-external helper directly.
export const fetchUserEvents = cache(getUserEventsExternal);
