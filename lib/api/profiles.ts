import { cache } from "react";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import {
  getUserByUsernameExternal,
  getUserByUsernameExternalResult,
  getUserEventsExternal,
} from "./users-external";
import { userTag } from "@lib/cache/tags";
import type { ServerReaderOptions } from "types/api/internal";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileByUsernameInternal(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}

export const fetchProfileBySlug = cache(fetchProfileByUsernameInternal);
export const fetchUserByUsername = cache(fetchProfileByUsernameInternal);

// Direct backend reader for profile pages. Calls getUserByUsernameExternalResult
// instead of looping back through /api/users/[username] (which breaks during
// `next build` and can hit Cloudflare 403/5xx on self-fetch).
export async function fetchUserBySlug(
  username: string,
  options: ServerReaderOptions = {},
): Promise<ProfileDetailResponseDTO | null> {
  if (!options.skipConnection) await connection();
  try {
    const result = await getUserByUsernameExternalResult(username, {
      skipConnection: true,
    });
    if (result.error) {
      throw Object.assign(result.error, { status: result.status });
    }
    return result.data;
  } catch (e) {
    console.error("Error fetching user by slug:", e);
    // Transient failure: re-throw for cached metadata/page readers so the error
    // is not cached as a null (a real 404 returned above, which is fine to cache).
    if (options.throwOnError) {
      throw e instanceof Error ? e : new Error(String(e));
    }
    return null;
  }
}

// Cached reader used by generateMetadata and the page Suspense gate.
// "use cache" is required under cacheComponents so the profile can be
// prerendered outside a Suspense boundary without "Uncached data was accessed
// outside of <Suspense>". Passes skipConnection: true so fetchWithHmac does
// not call connection() inside this "use cache" scope.
export async function getUserByUsernameCached(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  "use cache";
  cacheTag(userTag(username));
  const user = await fetchUserBySlug(username, {
    skipConnection: true,
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
