"use client";
import {
  MapPinIcon as LocationMarkerIcon,
} from "@heroicons/react/24/outline";
import Image from "@components/ui/common/image";
import ViewCounterIsland from "@components/ui/viewCounter/ViewCounterIsland";
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
    title,
    primaryLocation,
    image,
    eventDate,
    timeDisplay,
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

  const isFree = event.type === "FREE";

  return (
    <article className="relative rounded-card overflow-hidden bg-background shadow-sm hover:shadow-md transition-all duration-normal group h-full flex flex-col">
      <CardLinkClient
        href={`/e/${event.slug}`}
        className="absolute inset-0 z-[1]"
        aria-label={title}
        data-analytics-event-name="select_event"
        data-analytics-event-id={event.id ? String(event.id) : ""}
        data-analytics-event-slug={event.slug || ""}
      >
        <span className="sr-only">{title}</span>
      </CardLinkClient>

      {/* Image — clean, no overlays except favorite + badges */}
      <div
        className="relative aspect-[3/2] overflow-hidden bg-muted"
        style={{ viewTransitionName: `event-image-${event.id}` }}
      >
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          title={event.title}
          image={image}
          priority={isPriority}
          alt={event.title}
          location={event.city?.name || event.location}
          region={event.region?.name || event.city?.name}
          date={eventDate}
          context="list"
          cacheKey={event.hash || event.updatedAt}
        />

        {/* Favorite — top right */}
        {shouldShowFavoriteButton && (
          <FavoriteButtonOverlay
            eventSlug={event.slug}
            eventId={event.id ? String(event.id) : undefined}
            eventTitle={event.title}
            initialIsFavorite={initialIsFavorite}
            labels={favoriteLabels}
            wrapperClassName="pointer-events-auto z-[2]"
          />
        )}

        {/* FREE badge — bottom left */}
        {isFree && (
          <div className="absolute bottom-2 left-2 z-[2] pointer-events-none">
            <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-bold uppercase tracking-wide bg-success text-white shadow-xs">
              Free
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 pt-3 pb-3 pointer-events-none">
        {/* Date — colored, prominent */}
        <p className="text-sm font-semibold text-primary mb-1 truncate">
          {eventDate}
          {timeDisplay && <span className="text-foreground/50 font-normal"> · {timeDisplay}</span>}
        </p>

        {/* Title — bold */}
        <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground-strong mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Location + views — pushed to bottom */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {primaryLocation && (
            <div className="flex items-center gap-1 body-small text-foreground/60 min-w-0">
              <LocationMarkerIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{primaryLocation}</span>
            </div>
          )}
          {event.visits > 0 && (
            <ViewCounterIsland
              visits={event.visits}
              hideText
              className="flex items-center flex-shrink-0"
            />
          )}
        </div>
      </div>
    </article>
  );
}
