import { getFormattedDate } from "@utils/helpers";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { UIEvent } from "types/event";
import type { AppLocale } from "types/i18n";

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

export const addLocalizedDateFields = (
  events: EventSummaryResponseDTO[],
  locale: AppLocale
): EventSummaryResponseDTO[] => {
  return events.map((event) => {
    const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
      event.startDate,
      event.endDate,
      locale
    );
    return {
      ...event,
      formattedStart,
      formattedEnd: formattedEnd ?? null,
      nameDay,
    };
  });
};
