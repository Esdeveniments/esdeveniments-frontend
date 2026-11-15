import { formatEventDateLabel } from "@utils/date-helpers";
import { toLocalizedUrl } from "@utils/i18n-seo";
import type { EventDetailResponseDTO } from "types/api/event";
import type { ShareKitEvent } from "types/event";
import type { AppLocale } from "types/i18n";

/** Server-side: the share kit data for one event, in the page's locale. */
export function buildShareKitEvent(
  event: EventDetailResponseDTO,
  placeText: string,
  locale: AppLocale,
): ShareKitEvent {
  const slug = event.slug ?? "";
  return {
    slug,
    title: event.title ?? "",
    url: toLocalizedUrl(`/e/${slug}`, locale),
    dateText: formatEventDateLabel(
      event.startDate,
      event.endDate,
      locale,
      (start, end) => `${start} – ${end}`,
    ),
    placeText,
    imageUrl: event.imageUrl || null,
  };
}
