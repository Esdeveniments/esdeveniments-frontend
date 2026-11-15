import { computeTemporalStatus } from "@utils/event-status";
import {
  daysBetween,
  madridWallClockMs,
  resolveEventWindow,
  wallClockDay,
} from "@utils/event-window";
import { EXPIRED_EVENT_NOINDEX_DAYS, MS_PER_DAY } from "@utils/constants";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { canonicalizeLocaleTag } from "@utils/i18n-routing";
import { toLocalizedUrl } from "@utils/i18n-seo";
import localeLabels from "../i18n/locale-labels.generated.json";
import type {
  EventDetailResponseDTO,
  EventDetailTranslationDTO,
  EventSummaryResponseDTO,
  EventTranslationsMap,
  ListEvent,
  LocalizedEventText,
} from "types/api/event";
import type { CalendarEventData, EventAnalyticsSlugs } from "types/common";
import type { EventWindowInput } from "types/event-status";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";

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
 * isExpiredEvent for an event's own date fields, in Madrid days. Its last day
 * is the end date, or the start date when there is none: the backend's
 * importers send `endDate: null` for single-day events.
 */
export const isExpiredEventDates = (
  event: EventWindowInput,
  now = new Date()
): boolean => {
  const window = resolveEventWindow(event);
  if (!window) return false;
  const today = wallClockDay(madridWallClockMs(now));
  return (
    daysBetween(window.endDay ?? window.startDay, today) >
    EXPIRED_EVENT_NOINDEX_DAYS
  );
};

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

/**
 * Resolves display title and description for `locale` with independent flags
 * so a translated title never hides `<TranslateDescription>` when the body is
 * still Catalan. Keep source `event.title` for classification and series matching.
 */
export function resolveEventLocalizedText(
  event: Pick<EventSummaryResponseDTO, "title" | "description"> & {
    translations?: EventTranslationsMap<EventDetailTranslationDTO> | null;
  },
  locale: string = DEFAULT_LOCALE,
): LocalizedEventText {
  const parsed = canonicalizeLocaleTag(locale);
  if (!parsed || parsed.canonical === DEFAULT_LOCALE) {
    return {
      title: event.title || "",
      description: event.description || "",
      titleTranslated: false,
      descriptionTranslated: false,
    };
  }

  const map = event.translations;
  const lookup = (key: string) => {
    if (!map) return undefined;
    if (Object.hasOwn(map, key)) return map[key];
    const lower = key.toLowerCase();
    return Object.hasOwn(map, lower) ? map[lower] : undefined;
  };
  const exact = lookup(parsed.canonical);
  const fallbackBase =
    parsed.language !== parsed.canonical && parsed.language !== DEFAULT_LOCALE
      ? lookup(parsed.language)
      : undefined;

  const rawTitle = exact?.title?.trim() || fallbackBase?.title?.trim();
  const rawDescription =
    exact?.description?.trim() || fallbackBase?.description?.trim();

  return {
    title: rawTitle || event.title || "",
    description: rawDescription || event.description || "",
    titleTranslated: Boolean(rawTitle),
    descriptionTranslated: Boolean(rawDescription),
  };
}

/** Localized fallback event noun from `messages/*.json` (`Utils.EventFallbacks`). */
export function getDefaultEventNoun(
  locale: AppLocale = DEFAULT_LOCALE,
  cultural = false,
): string {
  const fallbacks =
    localeLabels.eventFallbacks[locale] ??
    localeLabels.eventFallbacks[DEFAULT_LOCALE];
  return cultural ? fallbacks.defaultCulturalEvent : fallbacks.defaultEvent;
}

/** Add-to-calendar data, shared by the sidebar card and the mobile action bar. */
export const buildCalendarEventData = (
  event: EventDetailResponseDTO,
  locale: AppLocale = DEFAULT_LOCALE,
): CalendarEventData => {
  const { title, description } = resolveEventLocalizedText(event, locale);
  return {
    title,
    description,
    location: [
      event.location,
      event.city?.name,
      event.region?.name,
      event.city?.postalCode,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", "),
    startDate: event.startDate,
    endDate: event.endDate,
    canonical: toLocalizedUrl(`/e/${event.slug}`, locale),
  };
};

/**
 * The event's interest keys for GA: its first category and its town (or its
 * region when it has no town), the same pair `view_event_page` sends, so
 * views, clicks and saves can be grouped the same way. "" when missing.
 */
export const getEventAnalyticsSlugs = (
  event: Pick<EventSummaryResponseDTO, "categories" | "city" | "region">,
): EventAnalyticsSlugs => ({
  categorySlug: event.categories?.[0]?.slug ?? "",
  placeSlug: event.city?.slug ?? event.region?.slug ?? "",
});
