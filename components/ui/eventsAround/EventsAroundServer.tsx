import ImageServer from "@components/ui/common/image/ImageServer";
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

function EventCardLoading({ layout }: { layout: EventsAroundLayout }) {
  const cardClass =
    layout === "horizontal"
      ? "flex-none w-96 min-w-[24rem] flex flex-col bg-background overflow-hidden cursor-pointer"
      : "flex-none w-40 min-w-[10rem] flex flex-col bg-background overflow-hidden cursor-pointer";

  const imageClass = layout === "horizontal" ? "w-full h-64" : "w-full h-32";

  return (
    <div className={cardClass}>
      {/* Image Placeholder */}
      <div
        className={`${imageClass} flex justify-center items-center overflow-hidden animate-fast-pulse`}
      >
        <div className="w-full h-full bg-muted"></div>
      </div>
      {/* Title Placeholder */}
      <div className="p-1 pt-4">
        <div className="w-2/3 h-5 bg-foreground-strong rounded-xl animate-fast-pulse"></div>
      </div>
      {/* Location Placeholder */}
      <div className="p-1">
        <div className="w-full h-full flex items-start animate-fast-pulse">
          <div className="h-4 w-4 bg-foreground-strong rounded-xl"></div>
          <div className="w-full h-full flex flex-col justify-center items-start px-2 gap-2">
            <div className="w-2/3 my-1 bg-foreground-strong h-3 rounded-xl"></div>
          </div>
        </div>
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
  // Deduplicate events defensively to avoid React key collisions when backend returns duplicates
  // Keep first occurrence order-stable. Key used: id fallback to slug.
  const uniqueEvents = dedupeEvents(events);

  // Generate JSON-LD data for SEO
  const generateJsonLdData = () => {
    if (!showJsonLd || uniqueEvents.length === 0) return null;

    const eventSchemas: SchemaOrgEvent[] = uniqueEvents
      .slice(0, 10) // Limit to first 10 events for performance
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
    const containerClass =
      layout === "horizontal"
        ? "w-full flex overflow-x-auto py-element-gap px-section-x gap-element-gap min-w-0"
        : "w-full flex overflow-x-auto py-element-gap px-section-x gap-element-gap min-w-0";

    return (
      <div className={containerClass}>
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
  const carouselSuffix = t("carouselSuffix");
  // Render different layouts
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
        >
          <div className="flex gap-element-gap">
            {uniqueEvents.map((event, index) => (
              <div
                role="listitem"
                // key uses id or slug; index fallback should never be needed due to dedup above
                key={event.id ?? event.slug ?? index}
                className="snap-start flex-none w-[85vw] min-w-[85vw] sm:w-96 sm:min-w-[24rem] flex flex-col bg-background overflow-hidden cursor-pointer"
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

  // Default compact layout - for related events on individual pages (no priority)
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
          const eventTitle = truncateString(event.title || "", 60);
          const image = event.imageUrl;

          // Format the date
          const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
            event.startDate,
            event.endDate,
            locale
          );
          const eventDate = formattedEnd
            ? `Del ${formattedStart} al ${formattedEnd}`
            : `${nameDay}, ${formattedStart}`;
          const { primaryLabel, secondaryLabel } = buildEventPlaceLabels({
            cityName: event.city?.name,
            regionName: event.region?.name,
            location: event.location,
          });

          return (
            <div
              key={event.id ?? event.slug ?? index}
              className="flex-none w-40 min-w-[10rem] flex flex-col bg-background overflow-hidden cursor-pointer"
            >
              <CardLink
                href={`/e/${event.slug}`}
                className="block pressable-card transition-card"
                data-analytics-event-name="related_event_click"
                data-analytics-event-id={event.id ? String(event.id) : ""}
                data-analytics-event-slug={event.slug || ""}
                data-analytics-position={String(index + 1)}
              >
                {/* ImageEvent */}
                <div className="w-full h-32 flex justify-center items-center overflow-hidden">
                  <ImageServer
                    className="w-full object-cover"
                    title={event.title}
                    alt={event.title}
                    image={image}
                    priority={false}
                    context="card"
                    cacheKey={event.hash || event.updatedAt}
                  />
                </div>
                {/* Title */}
                <div className="flex pt-2">
                  <div className="pt-[2px] pr-2">
                    <div className="w-2 h-4 bg-gradient-to-r from-primary to-primary-dark"></div>
                  </div>
                  <h3 className="heading-4 text-ellipsis overflow-hidden whitespace-nowrap">
                    {eventTitle}
                  </h3>
                </div>
                {/* Location - city primary, venue optional */}
                <div className="pt-1">
                  <div className="body-small font-normal text-ellipsis overflow-hidden whitespace-nowrap flex flex-col text-foreground">
                    <span className="truncate font-semibold">
                      {primaryLabel}
                    </span>
                    {secondaryLabel && (
                      <span className="truncate text-foreground/70">
                        {secondaryLabel}
                      </span>
                    )}
                  </div>
                </div>
                {/* Date */}
                <div className="pt-1">
                  <div className="body-small font-normal text-foreground/80 text-ellipsis overflow-hidden whitespace-nowrap">
                    <span>{eventDate}</span>
                  </div>
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
