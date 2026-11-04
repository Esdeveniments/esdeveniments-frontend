import { fetchEventBySlug } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { getAccessTokenFromCookies, getRefreshTokenFromCookies } from "@utils/auth-cookies";
import type { EventDetailResponseDTO } from "types/api/event";

/**
 * The event if the signed-in user owns it, else null. Owner-only pages 404 on
 * null so they don't reveal that the page exists.
 */
export async function getOwnedEventBySlug(
  slug: string,
): Promise<EventDetailResponseDTO | null> {
  const [event, currentUser] = await Promise.all([
    fetchEventBySlug(slug),
    getCurrentUser(),
  ]);
  const isOwner = Boolean(currentUser?.id) && currentUser?.id === event?.owner?.id;
  return event && isOwner ? event : null;
}

/**
 * True when the user is signed in but the access token expired or the backend
 * rejected it. Then getCurrentUser has no backend UUID, so the owner check
 * fails for the real owner until the session is refreshed.
 */
export async function ownerCheckNeedsRefresh(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return Boolean(await getRefreshTokenFromCookies());
  if (user.profileEnrichmentFailed === "auth") return true;
  return !(await getAccessTokenFromCookies());
}
