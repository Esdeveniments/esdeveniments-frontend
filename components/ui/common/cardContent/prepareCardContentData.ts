import { truncateString } from "@utils/helpers";
import { buildEventPlaceLabels } from "@utils/location-helpers";
import {
  formatCardDate,
  normalizeEndTime,
  formatTimeForAPI,
  convertTZ,
} from "@utils/date-helpers";
import { getLocalizedCategoryLabelFromConfig } from "@utils/category-helpers";
import type { CardContentProps, FavoriteButtonLabels } from "types/props";
import type { AppLocale } from "types/i18n";
import type { CardVariant } from "types/ui";

export function prepareCardContentData({
  event,
  variant = "standard",
  locale,
  tCard,
  tTime,
  preferPreformattedDates: _preferPreformattedDates,
  tCategories,
}: {
  event: CardContentProps["event"];
  variant?: CardVariant;
  locale: AppLocale;
  tCard: (key: string, values?: Record<string, string>) => string;
  tTime: (key: string, values?: Record<string, string>) => string;
  preferPreformattedDates?: boolean;
  tCategories?: (key: string) => string;
}) {
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

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

  const { cardDate, isMultiDay } = formatCardDate(
    event.startDate,
    event.endDate,
    locale,
  );

  // Urgency signals: "Today" / "Tomorrow"
  let urgencyLabel: string | undefined;
  let urgencyType: "today" | "tomorrow" | undefined;
  {
    const now = convertTZ(new Date(), "Europe/Madrid");
    const eventStart = convertTZ(new Date(event.startDate), "Europe/Madrid");
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const eventStr = `${eventStart.getFullYear()}-${eventStart.getMonth()}-${eventStart.getDate()}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${tomorrow.getMonth()}-${tomorrow.getDate()}`;

    if (eventStr === todayStr) {
      urgencyLabel = tCard("today");
      urgencyType = "today";
    } else if (eventStr === tomorrowStr) {
      urgencyLabel = tCard("tomorrow");
      urgencyType = "tomorrow";
    }
  }

  // Multi-day label
  const multiDayLabel = isMultiDay ? tCard("multipleDates") : undefined;

  const cleanStart = event.startTime ? formatTimeForAPI(event.startTime) : null;
  const cleanEnd = event.endTime ? formatTimeForAPI(event.endTime) : null;
  const normalizedEnd = normalizeEndTime(cleanStart, cleanEnd);
  const hasStartTime = !!cleanStart && cleanStart !== "00:00";
  const hasEndTime = !!normalizedEnd && normalizedEnd !== "00:00";

  let timeDisplay = "";
  if (hasStartTime) {
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

  // Price indicator — only show label for free events
  // TODO: Re-enable when backend has reliable pricing data.
  // Currently all events are marked FREE regardless of actual pricing.
  // const priceLabel = event.type === "FREE" ? tCard("free") : undefined;
  const priceLabel = undefined;

  // View count aria label
  const viewCountAriaLabel = tCard("viewCountAria", {
    count: String(event.visits ?? 0),
  });

  const firstCategory = event.categories?.[0];
  let categoryLabel: string | undefined;
  let categorySlug: string | undefined;
  if (firstCategory && variant !== "compact") {
    categorySlug = firstCategory.slug;
    categoryLabel = tCategories
      ? getLocalizedCategoryLabelFromConfig(
          firstCategory.slug,
          firstCategory.name,
          tCategories,
        )
      : firstCategory.name;
  }

  return {
    variant,
    timeLabels,
    title,
    primaryLocation,
    image,
    cardDate,
    isMultiDay,
    urgencyLabel,
    urgencyType,
    multiDayLabel,
    timeDisplay,
    favoriteLabels,
    shouldShowFavoriteButton,
    priceLabel,
    viewCountAriaLabel,
    categoryLabel,
    categorySlug,
  };
}
