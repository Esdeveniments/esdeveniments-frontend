import { SPRITE_ICON } from "@components/ui/common/IconSprite";
import Image from "@components/ui/common/image";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import CategoryBadge from "./CategoryBadge";
import type { CardLayoutProps } from "types/props";

/**
 * Shared presentational card layout used by CardContentServer, CardContentClient and NewsCard.
 * The title is the only link; `.card-event-link::after` stretches it over the card
 * (styles/globals.css). Receives a render prop for the link (server vs client variants).
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
  headingLevel: Heading = "h3",
  renderLink,
}: CardLayoutProps) {
  const {
    slug,
    eventId,
    title,
    image,
    cardDate,
    dateTime,
    timeDisplay,
    primaryLocation,
    categoryLabel,
    promotedLabel,
    urgencyLabel,
    urgencyType,
    untilLabel,
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
  const dateText = urgencyLabel ? (
    <span className={urgencyType === "today" ? "text-primary font-semibold" : "text-warning-dark font-medium"}>
      {urgencyLabel}
    </span>
  ) : (
    untilLabel ?? cardDate
  );

  return (
    <article className={`card-event relative rounded-card overflow-hidden bg-background border border-border/20 transition-[transform,border-color] duration-normal ease-smooth h-full flex flex-col${isHorizontal ? " card-event-split md:flex-row" : ""}`}>
      <div className={`relative aspect-[3/2] overflow-hidden bg-muted${isHorizontal ? imageWidthClass : ""}`}>
        {/* Decorative: the title link already names the card. */}
        <Image
          className="card-event-image w-full h-full object-cover transition-transform duration-slow"
          title={title}
          image={image}
          priority={isPriority}
          alt=""
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
          />
        )}
      </div>

      {/* Title first in the DOM (read first); `order-*` keeps badges and date above it. */}
      <div className={`flex-1 flex flex-col ${bodyClass}`}>
        <Heading className={`order-2 ${titleClass} text-foreground-strong`}>
          {position !== undefined && <span aria-hidden="true">{position}. </span>}
          {renderLink({
            href,
            className: "card-event-link",
            variant: "plain",
            "data-analytics-event-name": analyticsEventName,
            "data-analytics-event-id": eventId ?? "",
            "data-analytics-event-slug": slug || "",
            children: title,
          })}
        </Heading>

        <div className="order-1 flex flex-col">
          {promotedLabel && (
            <span className="badge-primary mb-1 w-fit">{promotedLabel}</span>
          )}
          <CategoryBadge label={categoryLabel} />

          <p className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground mb-1${compact ? " truncate" : ""}`}>
            {dateTime ? <time dateTime={dateTime}>{dateText}</time> : dateText}
            {urgencyLabel && untilLabel && <> · {untilLabel}</>}
            {timeDisplay && <> · {timeDisplay}</>}
          </p>
        </div>

        {isHorizontal && description && (
          <p className="order-3 body-normal text-muted-foreground line-clamp-3 mb-3">
            {description}
          </p>
        )}

        {primaryLocation && (
          <div className={`order-3 mt-auto flex items-center gap-1 ${compact ? "text-xs" : "text-sm"} text-muted-foreground min-w-0${isHorizontal ? " md:mt-0" : ""}`}>
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
