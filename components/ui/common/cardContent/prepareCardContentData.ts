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
import { TIMEZONE_MADRID } from "@utils/constants";

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
  tCard: (key: string, values?: Record<string, string | number>) => string;
  tTime: (key: string, values?: Record<string, string | number>) => string;
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
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      urgencyLabel = tCard("today");
      urgencyType = "today";
    } else if (diffDays === 1) {
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

  // Price indicator — disabled until backend provides reliable FREE/PAID data.
  // When enabled: uncomment the line below and remove the hardcoded undefined.
  // All card rendering (CardLayout, CardHorizontalServer) already supports priceLabel.
  // const priceLabel = event.type === "FREE" ? tCard("free") : undefined;
  const priceLabel = undefined;

  // View count aria label
  const viewCountAriaLabel = tCard("viewCountAria", {
    count: event.visits ?? 0,
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
