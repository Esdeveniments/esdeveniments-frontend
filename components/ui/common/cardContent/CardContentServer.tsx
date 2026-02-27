import {
  MapPinIcon as LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import Image from "@components/ui/common/image";
import CardLink from "./CardLink";
import ViewCounter from "@components/ui/viewCounter";
import { CardContentProps } from "types/props";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import { prepareCardContentData } from "./prepareCardContentData";

async function CardContentServer({
  event,
  isPriority = false,
  isHorizontal = false,
  initialIsFavorite,
}: CardContentProps) {
  const locale = await getLocaleSafely();
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
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
    preferPreformattedDates: false,
  });

  const isFavorite = Boolean(event.slug && initialIsFavorite);
  const firstCategory = event.categories?.[0];

  return (
    <article className="relative rounded-card overflow-hidden bg-background shadow-sm hover:shadow-md transition-all duration-normal group h-full flex flex-col">
      <CardLink
        href={`/e/${event.slug}`}
        className="absolute inset-0 z-[1]"
        aria-label={title}
        data-analytics-event-name="select_event"
        data-analytics-event-id={event.id ? String(event.id) : ""}
        data-analytics-event-slug={event.slug || ""}
      >
        <span className="sr-only">{title}</span>
      </CardLink>

      {/* Image with overlay elements */}
      <div className="relative aspect-[2/1] overflow-hidden bg-muted">
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-105"
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

        {/* Bottom gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Category badge — top left */}
        {firstCategory && (
          <div className="absolute top-3 left-3 z-[2] pointer-events-none">
            <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-xs font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm shadow-xs">
              {firstCategory.name}
            </span>
          </div>
        )}

        {/* Favorite — top right */}
        {shouldShowFavoriteButton && (
          <FavoriteButtonOverlay
            eventSlug={event.slug}
            eventId={event.id ? String(event.id) : undefined}
            eventTitle={event.title}
            initialIsFavorite={isFavorite}
            labels={favoriteLabels}
            wrapperClassName="pointer-events-auto z-[2]"
          />
        )}

        {/* Date overlay — bottom left */}
        <div className="absolute bottom-3 left-3 z-[2] pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm shadow-xs">
            <CalendarIcon className="w-3.5 h-3.5" />
            {eventDate}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-card-padding-sm pointer-events-none">
        {/* Title */}
        <h3 className="heading-4 line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Metadata */}
        <div className="flex flex-col gap-1 mt-auto">
          {timeDisplay && (
            <p className="body-small text-foreground/70 truncate">{timeDisplay}</p>
          )}
          {primaryLocation && (
            <div className="flex items-center gap-1.5 body-small text-foreground/70">
              <LocationMarkerIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{primaryLocation}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {event.visits > 0 && (
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/20">
            <ViewCounter visits={event.visits} hideText />
          </div>
        )}
      </div>
    </article>
  );
}

export default CardContentServer;
