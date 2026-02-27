import { truncateString } from "@utils/helpers";
import { buildEventPlaceLabels } from "@utils/location-helpers";
import { formatCardDate, normalizeEndTime, formatTimeForAPI } from "@utils/date-helpers";
import { getLocalizedCategoryLabelFromConfig } from "@utils/category-helpers";
import type { CardContentProps, FavoriteButtonLabels } from "types/props";
import type { AppLocale } from "types/i18n";
import type { CardVariant } from "types/ui";

const TITLE_MAX_LENGTH: Record<CardVariant, number> = {
  standard: 75,
  carousel: 60,
  compact: 50,
};

export function prepareCardContentData({
  event,
  variant = "standard",
  locale,
  tCard,
  tTime,
  preferPreformattedDates: _preferPreformattedDates,
  tCategories,
  // Legacy compat: isHorizontal maps to "carousel"
  isHorizontal,
}: {
  event: CardContentProps["event"];
  variant?: CardVariant;
  locale: AppLocale;
  tCard: (key: string, values?: Record<string, string>) => string;
  tTime: (key: string, values?: Record<string, string>) => string;
  preferPreformattedDates?: boolean;
  tCategories?: (key: string) => string;
  /** @deprecated Use `variant` instead */
  isHorizontal?: boolean;
}) {
  const resolvedVariant = isHorizontal ? "carousel" : variant;
  const titleMaxLen = TITLE_MAX_LENGTH[resolvedVariant];

  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

  const title = truncateString(event.title || "", titleMaxLen);

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
  if (firstCategory) {
    categoryLabel = tCategories
      ? getLocalizedCategoryLabelFromConfig(firstCategory.slug, firstCategory.name, tCategories)
      : firstCategory.name;
  }

  return {
    variant: resolvedVariant,
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
