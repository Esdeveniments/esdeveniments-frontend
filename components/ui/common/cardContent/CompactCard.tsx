import Image from "@components/ui/common/image";
import CardLink from "./CardLink";
import { prepareCardContentData } from "./prepareCardContentData";
import type { CompactCardProps } from "types/props";
import { MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";

export default function CompactCard({
  event,
  locale,
  tCard,
  tTime,
  index,
  analyticsEventName = "related_event_click",
}: CompactCardProps) {
  const {
    title,
    primaryLocation,
    image,
    cardDate,
    timeDisplay,
  } = prepareCardContentData({
    event,
    variant: "compact",
    locale,
    tCard,
    tTime,
  });

  return (
    <div className="flex-none w-44 min-w-[11rem]">
      <CardLink
        href={`/e/${event.slug}`}
        className="block rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group h-full"
        data-analytics-event-name={analyticsEventName}
        data-analytics-event-id={event.id ? String(event.id) : ""}
        data-analytics-event-slug={event.slug || ""}
        data-analytics-position={String(index + 1)}
      >
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <Image
            className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
            title={event.title}
            alt={event.title}
            image={image}
            priority={false}
            fetchPriority="low"
            location={primaryLocation}
            date={cardDate}
            context="card"
            cacheKey={event.hash || event.updatedAt}
          />
        </div>
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="text-[11px] text-muted-foreground mb-0.5 truncate">
            {cardDate}
            {timeDisplay && <> · {timeDisplay}</>}
          </p>
          <h3 className="text-sm font-medium leading-normal line-clamp-2 text-foreground-strong group-hover:text-primary/85 transition-colors mb-1">
            {title}
          </h3>
          {primaryLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <LocationMarkerIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{primaryLocation}</span>
            </div>
          )}
        </div>
      </CardLink>
    </div>
  );
}
