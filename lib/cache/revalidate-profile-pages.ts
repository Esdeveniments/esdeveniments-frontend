import { revalidateTag } from "next/cache";
import { captureException } from "@sentry/nextjs";
import { after } from "next/server";
import { userTag } from "@lib/cache/tags";
import { purgeProfilePagesFromCdn } from "@lib/cdn/cloudflare-purge";
import { getAuthenticatedUserExternal } from "@lib/api/users-external";

const USERNAME_READ_TIMEOUT_MS = 3_000;

/**
 * The signed-in user's username, to know which profile to expire. Never
 * throws: if the read fails the save still succeeds, and the profile expires
 * on its own cacheLife.
 */
export async function readCurrentUsername(
  accessToken: string,
): Promise<string | undefined> {
  try {
    const user = await getAuthenticatedUserExternal(accessToken, {
      timeout: USERNAME_READ_TIMEOUT_MS,
    });
    return user?.username ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Expires the public profile of each username, from a route handler, after a
 * profile or avatar change. Pass the old and new username on a rename.
 * `{ expire: 0 }` so the Cloudflare purge that follows can't be refilled with
 * stale HTML; after() runs it once the response has been sent. Never throws:
 * the change is already saved, and the pages expire on their own cacheLife.
 */
export function invalidateProfilePages(
  usernames: Iterable<string | null | undefined>,
): void {
  const unique = [...new Set(usernames)].filter(
    (username): username is string => Boolean(username),
  );
  if (unique.length === 0) return;
  try {
    for (const username of unique) {
      revalidateTag(userTag(username), { expire: 0 });
    }
    after(() => purgeProfilePagesFromCdn(unique));
  } catch (error) {
    captureException(error, { tags: { feature: "profile-cache" } });
  }
}
