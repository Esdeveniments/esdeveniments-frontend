import { computeTemporalStatus } from "@utils/event-status";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import type { AuthUser } from "types/auth";

/**
 * The card that gets the LCP preload and fetchPriority="high". Ads and events
 * without an image cannot be the LCP image, so the first card is not enough.
 */
export const hasCardImage = (
  event: ListEvent
): event is EventSummaryResponseDTO & { imageUrl: string } =>
  isEventSummaryResponseDTO(event) && Boolean(event.imageUrl?.trim());

/**
 * True when the signed-in user created the event. Both IDs must be set, so a
 * logged-out user never "owns" a legacy event with no owner.
 * Pure on purpose: the UI uses it to show owner actions, the server to
 * authorize them.
 */
export const isEventOwner = (
  userId: string | null | undefined,
  ownerId: string | null | undefined
): boolean => Boolean(userId) && userId === ownerId;

/**
 * True when the user may edit or delete the event: its creator or an admin.
 * Admins can manage any event, including scraped ones with no owner. The
 * backend runs the same check on every mutation, so this only decides what
 * the UI shows and lets our routes fail fast.
 */
export const canManageEvent = (
  user: Pick<AuthUser, "id" | "role"> | null | undefined,
  ownerId: string | null | undefined
): boolean => user?.role === "ADMIN" || isEventOwner(user?.id, ownerId);

/**
 * Returns true when the provided event is still live or upcoming.
 * Uses computeTemporalStatus so logic stays consistent across the app.
 */
export const isEventActive = (
  event: EventSummaryResponseDTO
): boolean => {
  const status = computeTemporalStatus(
    event.startDate,
    event.endDate,
    undefined,
    event.startTime,
    event.endTime
  );
  return status.state !== "past";
};

export function filterActiveEvents(
  events: ListEvent[] | EventSummaryResponseDTO[]
): EventSummaryResponseDTO[] {
  const realEvents = events.filter(
    isEventSummaryResponseDTO
  ) as EventSummaryResponseDTO[];
  return realEvents.filter(isEventActive);
}

// Event slugs are words, digits and an id joined by "-" (all 2,499 sitemap
// slugs matched on 2026-11-06). Validate before a slug reaches a backend path.
const EVENT_SLUG_RE = /^[A-Za-z0-9-]{1,512}$/;

export function isValidEventSlug(slug: string): boolean {
  return EVENT_SLUG_RE.test(slug);
}
