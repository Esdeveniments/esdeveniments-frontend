import Image from "@components/ui/common/image";
import CardHorizontalServer from "@components/ui/cardHorizontal/CardHorizontalServer";
import HorizontalScroll from "@components/ui/common/HorizontalScroll";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { buildEventPlaceLabels } from "@utils/location-helpers";
import { generateJsonData } from "@utils/schema-helpers";
import type { SchemaOrgEvent } from "types/schema";
import type { EventsAroundLayout, EventsAroundServerProps } from "types/common";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import CardLink from "@components/ui/common/cardContent/CardLink";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { CalendarIcon } from "@heroicons/react/24/outline";

function EventCardLoading({ layout }: { layout: EventsAroundLayout }) {
  const isHorizontal = layout === "horizontal";
  return (
    <div className={`rounded-card overflow-hidden bg-background shadow-sm flex flex-col ${isHorizontal ? "w-full" : "w-44 min-w-[11rem]"}`}>
      <div className={`bg-muted animate-fast-pulse ${isHorizontal ? "aspect-[16/10]" : "aspect-[4/3]"}`} />
      <div className="p-3 flex flex-col gap-2">
        <div className="w-3/4 h-4 bg-border/40 rounded animate-fast-pulse" />
        <div className="w-1/2 h-3 bg-border/40 rounded animate-fast-pulse" />
        <div className="w-2/3 h-3 bg-border/40 rounded animate-fast-pulse" />
      </div>
    </div>
  );
}

export function dedupeEvents(events: EventsAroundServerProps["events"]) {
  const seen = new Set<string | number | undefined>();
  const result = [] as typeof events;
  for (const ev of events) {
    const key = (ev.id as string | number | undefined) ?? ev.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ev);
  }
  return result;
}

async function EventsAroundServer({
  events,
  layout = "compact",
  loading = false,
  usePriority = false,
  showJsonLd = false,
  jsonLdId,
  title,
  useDetailTimeFormat = false,
}: EventsAroundServerProps) {
  const locale = await getLocaleSafely();
  const uniqueEvents = dedupeEvents(events);

  const generateJsonLdData = () => {
    if (!showJsonLd || uniqueEvents.length === 0) return null;

    const eventSchemas: SchemaOrgEvent[] = uniqueEvents
      .slice(0, 10)
      .map((event) => {
        try {
          return generateJsonData(event);
        } catch (err) {
          console.error(
            "Error generating JSON-LD data for event:",
            event.id,
            err
          );
          return null;
        }
      })
      .filter(Boolean) as SchemaOrgEvent[];

    if (eventSchemas.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${siteUrl}#itemlist-${title?.toLowerCase().replace(/\s+/g, "-")}`,
      name: title || "Related Events",
      numberOfItems: eventSchemas.length,
      itemListElement: eventSchemas.map((eventSchema, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: eventSchema,
      })),
    };
  };

  const jsonLdData = generateJsonLdData();

  if (loading) {
    return (
      <div className="w-full flex overflow-x-auto py-element-gap px-section-x gap-element-gap min-w-0">
        <EventCardLoading layout={layout} />
        <EventCardLoading layout={layout} />
        <EventCardLoading layout={layout} />
      </div>
    );
  }

  if (uniqueEvents.length === 0) {
    return null;
  }

  const t = await getTranslations("Components.EventsAround");
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tScroll = await getTranslations({
    locale,
    namespace: "Components.HorizontalScroll",
  });
  const carouselSuffix = t("carouselSuffix");

  if (layout === "horizontal") {
    return (
      <>
        {jsonLdData && (
          <JsonLdServer
            id={
              jsonLdId ||
              (title
                ? `events-around-${title.toLowerCase().replace(/\s+/g, "-")}`
                : "events-around")
            }
            data={jsonLdData}
          />
        )}
        <HorizontalScroll
          className="py-element-gap px-section-x"
          ariaLabel={title ? `${title} - ${carouselSuffix}` : undefined}
          nudgeOnFirstLoad
          showDesktopArrows
          hintStorageKey={jsonLdId || (title ? `carousel-${title}` : undefined)}
          labels={{ previous: tScroll("previous"), next: tScroll("next") }}
        >
          <div className="flex gap-element-gap">
            {uniqueEvents.map((event, index) => (
              <div
                role="listitem"
                key={event.id ?? event.slug ?? index}
                className="snap-start flex-none w-[80vw] min-w-[80vw] sm:w-72 sm:min-w-[18rem]"
              >
                <CardHorizontalServer
                  event={event}
                  isPriority={usePriority && index <= 2}
                  useDetailTimeFormat={useDetailTimeFormat}
                />
              </div>
            ))}
          </div>
        </HorizontalScroll>
      </>
    );
  }

  // Compact layout — related events on detail pages
  return (
    <>
      {jsonLdData && (
        <JsonLdServer
          id={
            jsonLdId ||
            (title
              ? `events-around-${title.toLowerCase().replace(/\s+/g, "-")}`
              : "events-around")
          }
          data={jsonLdData}
        />
      )}
      <div className="w-full flex overflow-x-auto py-element-gap px-section-x gap-element-gap min-w-0">
        {uniqueEvents.map((event, index) => {
          const eventTitle = truncateString(event.title || "", 50);
          const image = event.imageUrl;

          const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
            event.startDate,
            event.endDate,
            locale
          );
          const eventDate = formattedEnd
            ? tCard("dateRange", { start: formattedStart, end: formattedEnd })
            : tCard("dateSingle", { nameDay, start: formattedStart });
          const { primaryLabel } = buildEventPlaceLabels({
            cityName: event.city?.name,
            regionName: event.region?.name,
            location: event.location,
          });

          return (
            <div
              key={event.id ?? event.slug ?? index}
              className="flex-none w-44 min-w-[11rem]"
            >
              <CardLink
                href={`/e/${event.slug}`}
                className="block rounded-card overflow-hidden bg-background shadow-sm hover:shadow-md transition-all duration-normal group h-full"
                data-analytics-event-name="related_event_click"
                data-analytics-event-id={event.id ? String(event.id) : ""}
                data-analytics-event-slug={event.slug || ""}
                data-analytics-position={String(index + 1)}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-105"
                    title={event.title}
                    alt={event.title}
                    image={image}
                    priority={false}
                    fetchPriority="low"
                    location={primaryLabel}
                    date={eventDate}
                    context="card"
                    cacheKey={event.hash || event.updatedAt}
                  />
                  {/* Date pill */}
                  <div className="absolute bottom-2 left-2 pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-badge text-[10px] font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm">
                      <CalendarIcon className="w-2.5 h-2.5" />
                      {eventDate}
                    </span>
                  </div>
                </div>
                {/* Content */}
                <div className="p-2.5">
                  <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1">
                    {eventTitle}
                  </h3>
                  <p className="text-xs text-foreground/60 truncate">{primaryLabel}</p>
                </div>
              </CardLink>
            </div>
          );
        })}
      </div>
    </>
  );
};

EventsAroundServer.displayName = "EventsAroundServer";

export default EventsAroundServer;
