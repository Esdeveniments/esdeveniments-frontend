import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getUserByUsernameExternal, getUserEventsExternal } from "./users-external";
import { userTag } from "@lib/cache/tags";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileByUsernameInternal(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}

export const fetchProfileBySlug = cache(fetchProfileByUsernameInternal);
export const fetchUserByUsername = cache(fetchProfileByUsernameInternal);

// Cached reader for profile pages. Calls the external user endpoint directly
// instead of going through the internal /api/users/[username] route, avoiding
// build-time self-requests and keeping HMAC signing server-side. Caching is
// handled by the "use cache" boundary in getUserByUsernameCached.
export async function fetchUserBySlug(
  username: string,
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}

// Cached reader used by generateMetadata and the page Suspense gate.
// "use cache" is required under cacheComponents so the profile can be
// prerendered outside a Suspense boundary without "Uncached data was accessed
// outside of <Suspense>".
export async function getUserByUsernameCached(
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
