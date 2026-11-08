import { fetchEventBySlug } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { getAccessTokenFromCookies, getRefreshTokenFromCookies } from "@utils/auth-cookies";
import { canManageEvent, isEventOwner } from "@utils/event-helpers";
import type { EventDetailResponseDTO } from "types/api/event";
import type { AuthUser } from "types/auth";

async function getEventIf(
  slug: string,
  allowed: (user: AuthUser | null, event: EventDetailResponseDTO) => boolean,
): Promise<EventDetailResponseDTO | null> {
  const [event, currentUser] = await Promise.all([
    fetchEventBySlug(slug),
    getCurrentUser(),
  ]);
  return event && allowed(currentUser, event) ? event : null;
}

/**
 * The event if the signed-in user owns it, else null. Owner-only pages 404 on
 * null so they don't reveal that the page exists.
 */
export function getOwnedEventBySlug(slug: string) {
  return getEventIf(slug, (user, event) => isEventOwner(user?.id, event.owner?.id));
}

/** The event if the signed-in user owns it or is an admin, else null. */
export function getManageableEventBySlug(slug: string) {
  return getEventIf(slug, (user, event) => canManageEvent(user, event.owner?.id));
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
