import { MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import Image from "@components/ui/common/image";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import CategoryBadge from "./CategoryBadge";
import type { CardLayoutProps } from "types/props";

/**
 * Shared presentational card layout used by both CardContentServer and CardContentClient.
 * Receives render props for the link and counter components (server vs client variants).
 */
export default function CardLayout({
  slug,
  eventId,
  title,
  originalTitle,
  image,
  isPriority,
  cardDate,
  timeDisplay,
  primaryLocation,
  categoryLabel,
  categoryBadgeSize = "default",
  shouldShowFavoriteButton,
  isFavorite,
  favoriteLabels,
  visits,
  imageContext,
  imageCacheKey,
  imageViewTransitionName,
  renderLink,
  renderCounter,
}: CardLayoutProps) {
  return (
    <article className="relative rounded-card overflow-hidden bg-background shadow-sm hover:shadow-md transition-all duration-normal group h-full flex flex-col">
      {renderLink({
        href: `/e/${slug}`,
        className: "absolute inset-0 z-[1]",
        "aria-label": title,
        "data-analytics-event-name": "select_event",
        "data-analytics-event-id": eventId ? String(eventId) : "",
        "data-analytics-event-slug": slug || "",
        children: <span className="sr-only">{title}</span>,
      })}

      <div
        className="relative aspect-[3/2] overflow-hidden bg-muted"
        style={imageViewTransitionName ? { viewTransitionName: imageViewTransitionName } : undefined}
      >
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          title={originalTitle}
          image={image}
          priority={isPriority}
          alt={originalTitle}
          location={imageContext?.location}
          region={imageContext?.region}
          date={imageContext?.date ?? cardDate}
          context="list"
          cacheKey={imageCacheKey}
        />

        <CategoryBadge label={categoryLabel} size={categoryBadgeSize} />

        {shouldShowFavoriteButton && (
          <FavoriteButtonOverlay
            eventSlug={slug}
            eventId={eventId ? String(eventId) : undefined}
            eventTitle={originalTitle}
            initialIsFavorite={isFavorite}
            labels={favoriteLabels}
            wrapperClassName="pointer-events-auto z-[2]"
          />
        )}
      </div>

      <div className="flex-1 flex flex-col px-3 pt-3 pb-3 pointer-events-none">
        <p className="body-small text-muted-foreground mb-1 truncate">
          {cardDate}
          {timeDisplay && <> · {timeDisplay}</>}
        </p>

        <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground-strong mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2">
          {primaryLocation && (
            <div className="flex items-center gap-1 body-small text-foreground/60 min-w-0">
              <LocationMarkerIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{primaryLocation}</span>
            </div>
          )}
          {visits > 0 && renderCounter && (
            <div className="flex-shrink-0">
              {renderCounter(visits)}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
