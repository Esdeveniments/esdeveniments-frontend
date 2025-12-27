import { truncateString, getFormattedDate } from "@utils/helpers";
import { buildDisplayLocation } from "@utils/location-helpers";
import type { CardContentProps, FavoriteButtonLabels } from "types/props";
import type { AppLocale } from "types/i18n";

export function prepareCardContentData({
  event,
  isHorizontal,
  locale,
  tCard,
  tTime,
  preferPreformattedDates,
}: {
  event: CardContentProps["event"];
  isHorizontal: boolean;
  locale: AppLocale;
  tCard: (key: string, values?: Record<string, string>) => string;
  tTime: (key: string, values?: Record<string, string>) => string;
  preferPreformattedDates: boolean;
}) {
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

  const { formattedStart, formattedEnd, nameDay } =
    preferPreformattedDates && event.formattedStart && event.nameDay
      ? {
          formattedStart: event.formattedStart,
          formattedEnd: event.formattedEnd ?? null,
          nameDay: event.nameDay,
        }
      : getFormattedDate(event.startDate, event.endDate, locale);

  const title = truncateString(event.title || "", isHorizontal ? 30 : 75);

  const fullLocation = buildDisplayLocation({
    location: event.location || "",
    cityName: event.city?.name || "",
    regionName: event.region?.name || "",
    hidePlaceSegments: false,
  });
  const primaryLocation = truncateString(fullLocation, 80);

  const image = event.imageUrl || "";

  const eventDate = formattedEnd
    ? tCard("dateRange", { start: formattedStart, end: formattedEnd })
    : tCard("dateSingle", { nameDay, start: formattedStart });

  const favoriteLabels: FavoriteButtonLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };

  const shouldShowFavoriteButton = Boolean(event.slug);

  return {
    timeLabels,
    title,
    primaryLocation,
    image,
    eventDate,
    favoriteLabels,
    shouldShowFavoriteButton,
  };
}
