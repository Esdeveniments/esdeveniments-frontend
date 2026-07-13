import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  getInternalApiUrl,
  getVercelProtectionBypassHeaders,
} from "@utils/api-helpers";
import { parseUserPublic } from "@lib/validation/user";
import { userTag } from "@lib/cache/tags";
import {
  getUserByUsernameExternal,
  getUserEventsExternal,
} from "./users-external";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileByUsernameInternal(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}

export const fetchProfileBySlug = cache(fetchProfileByUsernameInternal);
export const fetchUserByUsername = cache(fetchProfileByUsernameInternal);

// Internal cached reader for profile pages. Mirrors fetchEventBySlug: it hits
// the internal /api/users/[username] route so the fetch can be tagged and
// revalidated, while HMAC signing stays server-side.
export async function fetchUserBySlug(
  username: string,
): Promise<ProfileDetailResponseDTO | null> {
  const internalApiUrl = await getInternalApiUrl(`/api/users/${encodeURIComponent(username)}`, {
    preferConfiguredOrigin: true,
  });

  const res = await fetch(internalApiUrl, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 1800, tags: [userTag(username)] },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const errorText = await res.text().catch(() => "No error text");
    console.error(
      `fetchUserBySlug: HTTP error! status: ${res.status}, url: ${internalApiUrl}, body: ${errorText}`,
    );
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return parseUserPublic(await res.json());
}

// Cached reader for generateMetadata and the page Suspense gate. "use cache"
// is required under cacheComponents so the profile can be prerendered outside
// a Suspense boundary without "Uncached data was accessed outside of <Suspense>".
export async function getUserByUsernameForMetadata(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  "use cache";
  cacheTag(userTag(username));
  const user = await fetchUserBySlug(username);
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
