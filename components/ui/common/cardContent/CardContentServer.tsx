import NextImage from "next/image";
import ClockIcon from "@heroicons/react/outline/esm/ClockIcon";
import LocationMarkerIcon from "@heroicons/react/outline/esm/LocationMarkerIcon";
import CalendarIcon from "@heroicons/react/outline/esm/CalendarIcon";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { buildDisplayLocation } from "@utils/location-helpers";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import ImageServer from "@components/ui/common/image/ImageServer";
import CardLink from "./CardLink";
import MobileShareIsland from "./MobileShareIsland";
import DesktopShareIsland from "./DesktopShareIsland";
import ViewCounter from "@components/ui/viewCounter";
import { CardContentProps } from "types/props";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import { getFavoritesFromCookies } from "@utils/favorites";
import { normalizeImageUrl } from "./normalizeImageUrl";

async function CardContentServer({
  event,
  isPriority = false,
  isHorizontal = false,
  initialIsFavorite,
}: CardContentProps) {
  const locale = await getLocaleSafely();
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };
  const { description, icon } = event.weather || {};
  const weatherIconUrl = normalizeImageUrl(icon);

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate,
    locale
  );

  const title = truncateString(event.title || "", isHorizontal ? 30 : 75);
  // Show full location: location, city, region combined
  // Note: List API responses may not include city/region, so we check if they exist
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

  let isFavorite = false;
  if (event.slug) {
    if (typeof initialIsFavorite === "boolean") {
      isFavorite = initialIsFavorite;
    } else {
      const favorites = await getFavoritesFromCookies();
      isFavorite = favorites.includes(event.slug);
    }
  }
  const shouldShowFavoriteButton = Boolean(event.slug);
  const favoriteLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };

  return (
    <>
      <div className="w-full relative pressable-card transition-card">
        <CardLink
          href={`/e/${event.slug}`}
          className="absolute inset-0"
          aria-label={title}
          data-analytics-event-name="select_event"
          data-analytics-event-id={event.id ? String(event.id) : ""}
          data-analytics-event-slug={event.slug || ""}
        >
          <span className="sr-only">{title}</span>
        </CardLink>
        <div className="w-full flex flex-col justify-center bg-background overflow-hidden cursor-pointer pointer-events-none">
          {/* Title and Weather Icon */}
          <div className="bg-background h-fit flex justify-start items-start gap-2 pr-4">
            <div className="flex justify-start items-center gap-0 pt-[2px] m-0">
              <div className="w-2 h-6 bg-gradient-to-r from-primary to-primary-dark"></div>
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
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                    priority={isPriority}
                  />
                </div>
              )}
            </div>
          </div>
          {/* ImageEvent */}
          <div className="p-2 flex justify-center items-center">
            <div
              className="w-full relative"
              style={{ height: isHorizontal ? "16rem" : "auto" }}
            >
              {shouldShowFavoriteButton && (
                <FavoriteButtonOverlay
                  eventSlug={event.slug}
                  initialIsFavorite={isFavorite}
                  labels={favoriteLabels}
                  wrapperClassName="pointer-events-auto"
                />
              )}
              <ImageServer
                className={`w-full flex justify-center ${isHorizontal ? "h-64 object-cover" : "object-contain"
                  }`}
                title={event.title}
                image={image}
                priority={isPriority}
                alt={event.title}
                location={event.city?.name || event.location}
                region={event.region?.name || event.city?.name}
                date={eventDate}
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
        <div className="flex items-center justify-end">
          <ViewCounter visits={event.visits} hideText />
        </div>
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

export default CardContentServer;
