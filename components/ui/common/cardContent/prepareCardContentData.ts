import { truncateString } from "@utils/helpers";
import { buildEventPlaceLabels } from "@utils/location-helpers";
import {
  formatCardDate,
  normalizeEndTime,
  formatTimeForAPI,
  convertTZ,
} from "@utils/date-helpers";
import { getCategoryLabel } from "@utils/category-helpers";
import type {
  CardContentProps,
  CardData,
  FavoriteButtonLabels,
} from "types/props";
import type { AppLocale } from "types/i18n";
import type { CardVariant } from "types/ui";
import { TIMEZONE_MADRID } from "@utils/constants";

export function prepareCardContentData({
  event,
  variant = "standard",
  locale,
  tCard,
  tCategories,
  isFavorite = false,
}: {
  event: CardContentProps["event"];
  variant?: CardVariant;
  locale: AppLocale;
  tCard: (key: string, values?: Record<string, string | number>) => string;
  tCategories?: (key: string) => string;
  isFavorite?: boolean;
}): CardData {
  const title = event.title || "";

  const { primaryLabel, secondaryLabel } = buildEventPlaceLabels({
    cityName: event.city?.name,
    regionName: event.region?.name,
    location: event.location,
  });
  const primaryLocation = truncateString(
    secondaryLabel ? `${primaryLabel}, ${secondaryLabel}` : primaryLabel,
    80,
  );

  const image = event.imageUrl || "";

  const { cardDate, isMultiDay, endLabel, endDay } = formatCardDate(
    event.startDate,
    event.endDate,
    locale,
  );

  // Urgency signals: "Today" / "Tomorrow"
  let urgencyLabel: string | undefined;
  let urgencyType: "today" | "tomorrow" | undefined;
  let diffDays: number;
  {
    const now = convertTZ(new Date(), TIMEZONE_MADRID);
    const eventStart = convertTZ(new Date(event.startDate), TIMEZONE_MADRID);

    // Normalize to midnight to compare dates only (avoids string-based fragility)
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfEventDay = new Date(
      eventStart.getFullYear(),
      eventStart.getMonth(),
      eventStart.getDate(),
    );

    const diffTime = startOfEventDay.getTime() - startOfToday.getTime();
    // Use Math.round to handle DST changes gracefully
    diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      urgencyLabel = tCard("today");
      urgencyType = "today";
    } else if (diffDays === 1) {
      urgencyLabel = tCard("tomorrow");
      urgencyType = "tomorrow";
    }
  }

  // A multi-day event that is running, or starts today or tomorrow, shows its
  // end ("Fins al 30 nov."); later ones keep the range. CompactCard keeps the range.
  const untilLabel =
    isMultiDay && endLabel && endDay !== undefined && diffDays <= 1 && variant !== "compact"
      ? tCard("until", { day: String(endDay), date: endLabel })
      : undefined;

  const cleanStart = event.startTime ? formatTimeForAPI(event.startTime) : null;
  const cleanEnd = event.endTime ? formatTimeForAPI(event.endTime) : null;
  const normalizedEnd = normalizeEndTime(cleanStart, cleanEnd);
  const hasStartTime = !!cleanStart && cleanStart !== "00:00";
  const hasEndTime = !!normalizedEnd && normalizedEnd !== "00:00";

  // Single-day events only: `<time>` can't hold a range. Computed here, not in
  // date-helpers, because the unit test mocks that module export by export.
  let dateTime: string | undefined;
  if (!isMultiDay) {
    const start = convertTZ(new Date(event.startDate), TIMEZONE_MADRID);
    if (!Number.isNaN(start.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const day = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      dateTime = hasStartTime ? `${day}T${cleanStart}` : day;
    }
  }

  let timeDisplay = "";
  // Next to "Until 30 Nov." a time would read as the end time.
  if (hasStartTime && !untilLabel) {
    if (hasEndTime) {
      timeDisplay = `${cleanStart} – ${normalizedEnd}`;
    } else {
      timeDisplay = cleanStart;
    }
  }

  const favoriteLabels: FavoriteButtonLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };

  const shouldShowFavoriteButton = Boolean(event.slug);

  const promotedLabel = event.isPromoted ? tCard("promoted") : undefined;

  const firstCategory = event.categories?.[0];
  let categoryLabel: string | undefined;
  if (firstCategory && variant !== "compact") {
    categoryLabel = tCategories
      ? getCategoryLabel(
          firstCategory.slug,
          firstCategory.name,
          tCategories,
        )
      : firstCategory.name;
  }

  return {
    slug: event.slug,
    eventId: event.id ? String(event.id) : undefined,
    title,
    primaryLocation,
    image,
    cardDate,
    dateTime,
    urgencyLabel,
    urgencyType,
    untilLabel,
    timeDisplay,
    favoriteLabels,
    shouldShowFavoriteButton,
    isFavorite: Boolean(event.slug && isFavorite),
    promotedLabel,
    categoryLabel,
    imageContext: {
      location: event.city?.name || event.location,
      region: event.region?.name || event.city?.name,
      date: cardDate,
    },
    imageCacheKey: event.hash || event.updatedAt,
  };
}
