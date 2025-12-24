"use client";
import NextImage from "next/image";
import ClockIcon from "@heroicons/react/outline/esm/ClockIcon";
import LocationMarkerIcon from "@heroicons/react/outline/esm/LocationMarkerIcon";
import CalendarIcon from "@heroicons/react/outline/esm/CalendarIcon";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import { buildDisplayLocation } from "@utils/location-helpers";
import Image from "@components/ui/common/image";
import ViewCounterIsland from "@components/ui/viewCounter/ViewCounterIsland";
import MobileShareIsland from "./MobileShareIsland";
import DesktopShareIsland from "./DesktopShareIsland";
import CardLinkClient from "./CardLinkClient";
import { CardContentProps } from "types/props";
import { useTranslations, useLocale } from "next-intl";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import { normalizeImageUrl } from "./normalizeImageUrl";

export default function CardContentClient({
  event,
  isPriority = false,
  isHorizontal = false,
  initialIsFavorite = false,
}: CardContentProps) {
  const tCard = useTranslations("Components.CardContent");
  const tTime = useTranslations("Utils.EventTime");
  const locale = (useLocale?.() || DEFAULT_LOCALE) as AppLocale;
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };

  const { description, icon } = event.weather || {};
  const { formattedStart, formattedEnd, nameDay } =
    event.formattedStart && event.nameDay
      ? {
        formattedStart: event.formattedStart,
        formattedEnd: event.formattedEnd ?? null,
        nameDay: event.nameDay,
      }
      : getFormattedDate(event.startDate, event.endDate, locale);

  const title = truncateString(event.title || "", isHorizontal ? 30 : 75);

  const cityName = event.city?.name;
  const regionName = event.region?.name;
  const fullLocation = buildDisplayLocation({
    location: event.location || "",
    cityName: cityName || "",
    regionName: regionName || "",
    hidePlaceSegments: false,
  });
  const primaryLocation = truncateString(fullLocation, 80);

  const image = event.imageUrl || "";

  const eventDate = formattedEnd
    ? tCard("dateRange", { start: formattedStart, end: formattedEnd })
    : tCard("dateSingle", { nameDay, start: formattedStart });

  const weatherIconUrl = normalizeImageUrl(icon);
  const favoriteLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };
  const shouldShowFavoriteButton = Boolean(event.slug);

  return (
    <>
      <div className="w-full relative pressable-card transition-card">
        <CardLinkClient
          href={`/e/${event.slug}`}
          className="absolute inset-0"
          aria-label={title}
          data-analytics-event-name="select_event"
          data-analytics-event-id={event.id ? String(event.id) : ""}
          data-analytics-event-slug={event.slug || ""}
        >
          <span className="sr-only">{title}</span>
        </CardLinkClient>

        <div className="w-full flex flex-col justify-center bg-background overflow-hidden cursor-pointer pointer-events-none">
          <div className="bg-background h-fit flex justify-start items-start gap-element-gap-sm pr-card-padding-sm">
            <div className="flex justify-start items-center gap-0 pt-[2px] m-0">
              <div className="w-2 h-6 bg-gradient-to-r from-primary to-primary-dark" />
            </div>
            <h3 className="heading-4 flex-1 min-w-0">{title}</h3>
            <div className="flex items-end gap-2 shrink-0">
              {weatherIconUrl && (
                <div className="flex items-center gap-1">
                  <NextImage
                    alt={description || "Weather icon"}
                    src={weatherIconUrl}
                    width={30}
                    height={30}
                    style={{ maxWidth: "100%", height: "auto" }}
                    priority={isPriority}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="py-4 flex justify-center items-center">
            <div
              className="w-full relative"
              style={{
                height: isHorizontal ? "16rem" : "auto",
                viewTransitionName: `event-image-${event.id}`,
              }}
            >
              {shouldShowFavoriteButton && (
                <FavoriteButtonOverlay
                  eventSlug={event.slug}
                  initialIsFavorite={initialIsFavorite}
                  labels={favoriteLabels}
                  wrapperClassName="pointer-events-auto"
                />
              )}
              <Image
                className={`w-full flex justify-center ${isHorizontal ? "h-64 object-cover" : "object-contain"
                  }`}
                title={event.title}
                image={image}
                priority={isPriority}
                alt={event.title}
                context={isHorizontal ? "list" : "card"}
                cacheKey={event.hash || event.updatedAt}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-between items-center mb-element-gap-sm">
        <div className="flex items-center">
          <MobileShareIsland
            title={event.title}
            slug={event.slug}
            eventDate={eventDate}
            location={primaryLocation}
          />
          <DesktopShareIsland slug={event.slug} />
        </div>
        <ViewCounterIsland
          visits={event.visits}
          priority={isPriority}
          hideText
          className="flex items-center justify-end"
        />
      </div>

      <div className="w-full flex flex-col gap-element-gap">
        <div className="flex justify-start items-start">
          <CalendarIcon className="h-5 w-5" />
          <p className="body-small px-element-gap-sm font-semibold">{eventDate}</p>
        </div>
        <div className="flex justify-start items-start">
          <LocationMarkerIcon className="h-5 w-5" />
          <div className="h-full flex flex-col justify-start items-start px-element-gap-sm">
            <p className="body-small max-w-full capitalize">{primaryLocation}</p>
          </div>
        </div>
        <div className="flex justify-start items-center">
          <ClockIcon className="h-5 w-5" />
          <p className="body-small px-element-gap-sm">
            {formatEventTimeDisplayDetail(
              event.startTime,
              event.endTime,
              timeLabels
            )}
          </p>
        </div>
        {!isHorizontal && <div className="mb-element-gap" />}
      </div>
    </>
  );
}
