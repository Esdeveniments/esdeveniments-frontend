import { truncateString } from "@utils/helpers";
import { buildEventPlaceLabels } from "@utils/location-helpers";
import { formatCardDate, normalizeEndTime, formatTimeForAPI } from "@utils/date-helpers";
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
    80
  );

  const image = event.imageUrl || "";

  const { cardDate, isMultiDay } = formatCardDate(
    event.startDate,
    event.endDate,
    locale
  );

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

  const firstCategory = event.categories?.[0];
  let categoryLabel: string | undefined;
  if (firstCategory && variant !== "compact") {
    categoryLabel = tCategories
      ? getLocalizedCategoryLabelFromConfig(firstCategory.slug, firstCategory.name, tCategories)
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
    timeDisplay,
    favoriteLabels,
    shouldShowFavoriteButton,
    categoryLabel,
  };
}
