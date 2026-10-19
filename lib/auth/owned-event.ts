import { fetchEventBySlug } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
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
