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
  priceLabel,
  urgencyLabel,
  urgencyType,
  multiDayLabel,
  shouldShowFavoriteButton,
  isFavorite,
  favoriteLabels,
  imageContext,
  imageCacheKey,
  imageViewTransitionName,
  renderLink,
}: CardLayoutProps) {
  return (
    <article className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group h-full flex flex-col">
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

      <div className="flex-1 flex flex-col px-4 pt-3 pb-4 pointer-events-none">
        <CategoryBadge label={categoryLabel} />

        <p className="text-sm text-muted-foreground mb-1 truncate">
          {urgencyLabel ? (
            <span className={urgencyType === "today" ? "text-primary font-semibold" : "text-warning-dark font-medium"}>
              {urgencyLabel}
            </span>
          ) : (
            cardDate
          )}
          {timeDisplay && <> · {timeDisplay}</>}
          {priceLabel && <> · <span className="text-success font-medium">{priceLabel}</span></>}
          {multiDayLabel && <> · <span className="text-muted-foreground">{multiDayLabel}</span></>}
        </p>

        <h3 className="text-base font-semibold leading-normal line-clamp-2 text-foreground-strong mb-1.5 min-h-[2.75rem] group-hover:text-primary/85 transition-colors">
          {title}
        </h3>

        {primaryLocation && (
          <div className="mt-auto flex items-center gap-1 text-sm text-muted-foreground min-w-0">
            <LocationMarkerIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{primaryLocation}</span>
          </div>
        )}
      </div>
    </article>
  );
}
