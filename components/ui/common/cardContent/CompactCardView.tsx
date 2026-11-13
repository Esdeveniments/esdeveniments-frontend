import Image from "@components/ui/common/image";
import { prepareCardContentData } from "./prepareCardContentData";
import type { CompactCardViewProps } from "types/props";
import { SPRITE_ICON } from "@components/ui/common/IconSprite";

// Compact event card: related events (event page) and the map selection.
// Same link pattern as CardLayout: the title is the only link and
// `.card-event-link::after` stretches it over the card. The locale comes as a
// prop (the event page body is "use cache"); the link component is the server
// or client one, see CompactCard and CompactCardClient.
export default function CompactCardView({
  event,
  locale,
  tCard,
  index,
  analyticsEventName = "related_event_click",
  LinkComponent,
}: CompactCardViewProps) {
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
    <article className="card-event relative flex-none w-44 rounded-card overflow-hidden bg-background border border-border/20 transition-[transform,border-color] duration-normal ease-smooth flex flex-col">
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
      {/* Title first in the DOM (read first); `order-*` keeps the date above it.
          Type and padding match CardLayout's compact card. */}
      <div className="px-3.5 pt-2.5 pb-3.5 flex flex-col">
        <h3 className="order-2 text-sm font-semibold leading-normal line-clamp-2 text-foreground-strong mb-1">
          <LinkComponent
            href={`/e/${event.slug}`}
            className="card-event-link"
            variant="plain"
            data-analytics-event-name={analyticsEventName}
            data-analytics-event-id={event.id ? String(event.id) : ""}
            data-analytics-event-slug={event.slug || ""}
            data-analytics-position={String(index + 1)}
          >
            {title}
          </LinkComponent>
        </h3>
        {/* Wraps instead of truncating: a date range would hide the time. */}
        <p className="order-1 text-xs text-muted-foreground mb-0.5 line-clamp-2">
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
