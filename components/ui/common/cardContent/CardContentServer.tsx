import {
  MapPinIcon as LocationMarkerIcon,
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

      {/* Image — clean, with category badge + favorite */}
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
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

        {/* Category badge — top left */}
        {firstCategory && (
          <div className="absolute top-2.5 left-2.5 z-[2] pointer-events-none">
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
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 pt-3 pb-3 pointer-events-none">
        {/* Date + time — muted, scannable */}
        <p className="body-small text-muted-foreground mb-1 truncate">
          {eventDate}
          {timeDisplay && <> · {timeDisplay}</>}
        </p>

        {/* Title — bold, prominent */}
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
            <div className="flex-shrink-0">
              <ViewCounter visits={event.visits} hideText />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default CardContentServer;
