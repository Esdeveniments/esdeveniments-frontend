import { computeTemporalStatus } from "@utils/event-status";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";

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
  events: ListEvent[]
): EventSummaryResponseDTO[];
export function filterActiveEvents(
  events: EventSummaryResponseDTO[]
): EventSummaryResponseDTO[];
export function filterActiveEvents(
  events: ListEvent[] | EventSummaryResponseDTO[]
): EventSummaryResponseDTO[] {
  return events
    .filter(isEventSummaryResponseDTO)
    .filter(isEventActive);
}
