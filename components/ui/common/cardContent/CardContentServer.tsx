import {
  MapPinIcon as LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import Image from "@components/ui/common/image";
import CardLink from "./CardLink";
import MobileShareIsland from "./MobileShareIsland";
import DesktopShareIsland from "./DesktopShareIsland";
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

  return (
    <article className="relative card-bordered overflow-hidden group">
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

      {/* Image — fixed aspect ratio, image-first */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
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
        <Image
          className="w-full h-full object-cover"
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
      </div>

      {/* Content */}
      <div className="p-card-padding-sm md:p-card-padding pointer-events-none">
        {/* Title with red accent */}
        <div className="flex items-start gap-2 mb-element-gap-sm">
          <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary-dark flex-shrink-0 mt-0.5 rounded-full" />
          <h3 className="heading-4 line-clamp-2 flex-1 min-w-0 group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>

        {/* Metadata — consolidated */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 body-small text-foreground">
            <CalendarIcon className="w-4 h-4 flex-shrink-0 text-foreground/60" />
            <span className="truncate">
              {eventDate}
              {timeDisplay && <> · {timeDisplay}</>}
            </span>
          </div>
          {primaryLocation && (
            <div className="flex items-center gap-2 body-small text-foreground">
              <LocationMarkerIcon className="w-4 h-4 flex-shrink-0 text-foreground/60" />
              <span className="truncate">{primaryLocation}</span>
            </div>
          )}
        </div>

        {/* Footer: share + views — share hidden until hover */}
        <div className="flex justify-between items-center mt-element-gap-sm pt-element-gap-sm border-t border-border/30">
          <div className="flex items-center pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-normal max-sm:opacity-100">
            <MobileShareIsland
              title={event.title}
              slug={event.slug}
              eventDate={eventDate}
              location={primaryLocation}
            />
            <DesktopShareIsland slug={event.slug} />
          </div>
          <div className="flex items-center">
            <ViewCounter visits={event.visits} hideText />
          </div>
        </div>
      </div>
    </article>
  );
}

export default CardContentServer;
