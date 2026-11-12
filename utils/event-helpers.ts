import { computeTemporalStatus } from "@utils/event-status";
import { EXPIRED_EVENT_NOINDEX_DAYS, MS_PER_DAY } from "@utils/constants";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { siteUrl } from "@config/index";
import type {
  EventDetailResponseDTO,
  EventSummaryResponseDTO,
  ListEvent,
} from "types/api/event";
import type { CalendarEventData } from "types/common";

/**
 * Whether an event ended more than EXPIRED_EVENT_NOINDEX_DAYS ago. Its page is
 * then noindexed, and a festa major act 301s to its town hub (proxy).
 */
export const isExpiredEvent = (
  end: Date | undefined,
  now = Date.now()
): boolean =>
  end !== undefined &&
  now - end.getTime() > EXPIRED_EVENT_NOINDEX_DAYS * MS_PER_DAY;

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

/** Add-to-calendar data, shared by the sidebar card and the mobile action bar. */
export const buildCalendarEventData = (
  event: EventDetailResponseDTO
): CalendarEventData => ({
  title: event.title,
  description: event.description,
  location: [event.location, event.city?.name, event.region?.name, event.city?.postalCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", "),
  startDate: event.startDate,
  endDate: event.endDate,
  canonical: `${siteUrl}/e/${event.slug}`,
});
