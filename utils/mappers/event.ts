import { getFormattedDate } from "@utils/helpers";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { UIEvent } from "types/event";

export function toUIEvent(event: EventSummaryResponseDTO): UIEvent {
  const { formattedStart, formattedEnd, duration } = getFormattedDate(
    event.startDate,
    event.endDate
  );

  const isFullDayEvent = event.startTime == null && event.endTime == null;

  return {
    ...event,
    formattedStart,
    formattedEnd: formattedEnd || undefined,
    isFullDayEvent,
    duration,
    timeUntilEvent: "",
  };
}


