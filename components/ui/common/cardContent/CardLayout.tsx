import { SPRITE_ICON } from "@components/ui/common/IconSprite";
import Image from "@components/ui/common/image";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import CategoryBadge from "./CategoryBadge";
import type { CardLayoutProps } from "types/props";

/**
 * Shared presentational card layout used by CardContentServer, CardContentClient and NewsCard.
 * Receives a render prop for the link (server vs client variants).
 */
export default function CardLayout({
  card,
  layout = "default",
  compact = false,
  href = `/e/${card.slug}`,
  analyticsEventName = "select_event",
  description,
  position,
  isPriority,
  renderLink,
}: CardLayoutProps) {
  const {
    slug,
    eventId,
    title,
    image,
    cardDate,
    timeDisplay,
    primaryLocation,
    categoryLabel,
    promotedLabel,
    urgencyLabel,
    urgencyType,
    multiDayLabel,
    shouldShowFavoriteButton,
    isFavorite,
    favoriteLabels,
    imageContext,
    imageCacheKey,
  } = card;
  // `featured` and `row` share the side-by-side layout; only the image width differs.
  const isHorizontal = layout !== "default";
  const imageWidthClass = layout === "row" ? " md:w-2/5 md:shrink-0" : " md:w-1/2 md:shrink-0";
  const bodyClass = isHorizontal
    ? "px-4 pt-3 pb-4 md:p-card-padding md:justify-center"
    : compact
      ? "px-3.5 pt-2.5 pb-3.5"
      : "px-4 pt-3 pb-4";
  const titleClass = isHorizontal
    ? "heading-3 line-clamp-3 mb-2"
    : compact
      ? "text-sm font-semibold leading-normal line-clamp-2 mb-1.5"
      : "text-base font-semibold leading-normal line-clamp-2 mb-1.5 min-h-[2.75rem]";

  return (
    <article className={`relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group h-full flex flex-col${isHorizontal ? " md:flex-row" : ""}`}>
      {renderLink({
        href,
        className: "absolute inset-0 z-[1]",
        "aria-label": title,
        "data-analytics-event-name": analyticsEventName,
        "data-analytics-event-id": eventId ?? "",
        "data-analytics-event-slug": slug || "",
        children: <span className="sr-only">{title}</span>,
      })}

      <div className={`relative aspect-[3/2] overflow-hidden bg-muted${isHorizontal ? imageWidthClass : ""}`}>
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          title={title}
          image={image}
          priority={isPriority}
          alt={title}
          location={imageContext?.location}
          region={imageContext?.region}
          date={imageContext?.date ?? cardDate}
          context={isHorizontal ? layout : "list"}
          cacheKey={imageCacheKey}
        />

        {shouldShowFavoriteButton && favoriteLabels && (
          <FavoriteButtonOverlay
            eventSlug={slug}
            eventId={eventId}
            initialIsFavorite={Boolean(isFavorite)}
            labels={favoriteLabels}
            wrapperClassName="pointer-events-auto z-[2]"
          />
        )}
      </div>

      <div className={`flex-1 flex flex-col pointer-events-none ${bodyClass}`}>
        {promotedLabel && (
          <span className="badge-primary mb-1 w-fit">{promotedLabel}</span>
        )}
        <CategoryBadge label={categoryLabel} />

        <p className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground mb-1${compact ? " truncate" : ""}`}>
          {urgencyLabel ? (
            <span className={urgencyType === "today" ? "text-primary font-semibold" : "text-warning-dark font-medium"}>
              {urgencyLabel}
            </span>
          ) : (
            cardDate
          )}
          {timeDisplay && <> · {timeDisplay}</>}
          {multiDayLabel && <> · <span className="text-muted-foreground">{multiDayLabel}</span></>}
        </p>

        <h3 className={`${titleClass} text-foreground-strong group-hover:text-primary/85 transition-colors`}>
          {position !== undefined && `${position}. `}
          {title}
        </h3>

        {isHorizontal && description && (
          <p className="body-normal text-muted-foreground line-clamp-3 mb-3">
            {description}
          </p>
        )}

        {primaryLocation && (
          <div className={`mt-auto flex items-center gap-1 ${compact ? "text-xs" : "text-sm"} text-muted-foreground min-w-0${isHorizontal ? " md:mt-0" : ""}`}>
            <svg className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} flex-shrink-0`} aria-hidden="true">
              <use href={`#${SPRITE_ICON.mapPin}`} />
            </svg>
            <span className="truncate">{primaryLocation}</span>
          </div>
        )}
      </div>
    </article>
  );
}
