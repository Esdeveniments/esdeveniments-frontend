import { computeTemporalStatus } from "@utils/event-status";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";

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
