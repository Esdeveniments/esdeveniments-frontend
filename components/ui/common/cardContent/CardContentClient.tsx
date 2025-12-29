"use client";
import {
  ClockIcon,
  MapPinIcon as LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import Image from "@components/ui/common/image";
import ViewCounterIsland from "@components/ui/viewCounter/ViewCounterIsland";
import MobileShareIsland from "./MobileShareIsland";
import DesktopShareIsland from "./DesktopShareIsland";
import CardLinkClient from "./CardLinkClient";
import { CardContentProps } from "types/props";
import { useTranslations, useLocale } from "next-intl";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import { prepareCardContentData } from "./prepareCardContentData";

export default function CardContentClient({
  event,
  isPriority = false,
  isHorizontal = false,
  initialIsFavorite = false,
}: CardContentProps) {
  const tCard = useTranslations("Components.CardContent");
  const tTime = useTranslations("Utils.EventTime");
  const locale = (useLocale() || DEFAULT_LOCALE) as AppLocale;
  const {
    timeLabels,
    title,
    primaryLocation,
    image,
    eventDate,
    favoriteLabels,
    shouldShowFavoriteButton,
  } = prepareCardContentData({
    event,
    isHorizontal,
    locale,
    tCard,
    tTime,
    preferPreformattedDates: true,
  });

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
                  eventId={event.id ? String(event.id) : undefined}
                  eventTitle={event.title}
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
                location={event.city?.name || event.location}
                region={event.region?.name || event.city?.name}
                date={eventDate}
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
