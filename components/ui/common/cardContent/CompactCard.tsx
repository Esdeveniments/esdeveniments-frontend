import Image from "@components/ui/common/image";
import CardLink from "./CardLink";
import { prepareCardContentData } from "./prepareCardContentData";
import type { CompactCardProps } from "types/props";
import { SPRITE_ICON } from "@components/ui/common/IconSprite";

// Related-events card (event page). Same link pattern as CardLayout: the title is
// the only link and `.card-event-link::after` stretches it over the card. It
// renders inside the event page's "use cache" body, so the locale comes as a prop.
export default function CompactCard({
  event,
  locale,
  tCard,
  index,
  analyticsEventName = "related_event_click",
}: CompactCardProps) {
  const {
    title,
    primaryLocation,
    image,
    cardDate,
    dateTime,
    timeDisplay,
  } = prepareCardContentData({
    event,
    variant: "compact",
    locale,
    tCard,
  });

  return (
    <article className="card-event relative flex-none w-44 min-w-[11rem] rounded-card overflow-hidden bg-background border border-border/20 transition-[transform,border-color] duration-normal ease-smooth flex flex-col">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {/* Decorative: the title link already names the card. */}
        <Image
          className="card-event-image w-full h-full object-cover transition-transform duration-slow"
          title={event.title}
          alt=""
          image={image}
          priority={false}
          fetchPriority="low"
          location={primaryLocation}
          date={cardDate}
          context="card"
          cacheKey={event.hash || event.updatedAt}
        />
      </div>
      {/* Title first in the DOM (read first); `order-*` keeps the date above it. */}
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col">
        <h3 className="order-2 text-sm font-medium leading-normal line-clamp-2 text-foreground-strong mb-1">
          <CardLink
            href={`/e/${event.slug}`}
            className="card-event-link"
            variant="plain"
            data-analytics-event-name={analyticsEventName}
            data-analytics-event-id={event.id ? String(event.id) : ""}
            data-analytics-event-slug={event.slug || ""}
            data-analytics-position={String(index + 1)}
          >
            {title}
          </CardLink>
        </h3>
        <p className="order-1 text-xs text-muted-foreground mb-0.5 truncate">
          {dateTime ? <time dateTime={dateTime}>{cardDate}</time> : cardDate}
          {timeDisplay && <> · {timeDisplay}</>}
        </p>
        {primaryLocation && (
          <div className="order-3 flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            <svg className="w-3 h-3 flex-shrink-0" aria-hidden="true">
              <use href={`#${SPRITE_ICON.mapPin}`} />
            </svg>
            <span className="truncate">{primaryLocation}</span>
          </div>
        )}
      </div>
    </article>
  );
}
