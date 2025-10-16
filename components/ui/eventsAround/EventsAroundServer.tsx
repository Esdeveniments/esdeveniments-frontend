import { memo, FC } from "react";
import Script from "next/script";
import Link from "next/link";
import ImageServer from "@components/ui/common/image/ImageServer";
import CardHorizontalServer from "@components/ui/cardHorizontal/CardHorizontalServer";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { generateJsonData } from "@utils/schema-helpers";
import type { SchemaOrgEvent } from "types/schema";
import type { EventsAroundLayout, EventsAroundServerProps } from "types/common";
import { siteUrl } from "@config/index";

const EventCardLoading: FC<{ layout: EventsAroundLayout }> = ({ layout }) => {
  const cardClass =
    layout === "horizontal"
      ? "flex-none w-96 min-w-[24rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer"
      : "flex-none w-40 min-w-[10rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer";

  const imageClass = layout === "horizontal" ? "w-full h-64" : "w-full h-32";

  return (
    <div className={cardClass}>
      {/* Image Placeholder */}
      <div
        className={`${imageClass} flex justify-center items-center overflow-hidden animate-fast-pulse`}
      >
        <div className="w-full h-full bg-darkCorp"></div>
      </div>
      {/* Title Placeholder */}
      <div className="p-1 pt-4">
        <div className="w-2/3 h-5 bg-darkCorp rounded-xl animate-fast-pulse"></div>
      </div>
      {/* Location Placeholder */}
      <div className="p-1">
        <div className="w-full h-full flex items-start animate-fast-pulse">
          <div className="h-4 w-4 bg-darkCorp rounded-xl"></div>
          <div className="w-full h-full flex flex-col justify-center items-start px-2 gap-2">
            <div className="w-2/3 my-1 bg-darkCorp h-3 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventsAroundServer: FC<EventsAroundServerProps> = ({
  events,
  layout = "compact",
  loading = false,
  usePriority = false,
  showJsonLd = false,
  jsonLdId,
  title,
  nonce = "",
}) => {
  // Deduplicate events defensively to avoid React key collisions when backend returns duplicates
  // Keep first occurrence order-stable. Key used: id fallback to slug.
  const uniqueEvents = (() => {
    const seen = new Set<string | number | undefined>();
    const result = [] as typeof events;
    for (const ev of events) {
      const key = (ev.id as string | number | undefined) ?? ev.slug;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(ev);
    }
    return result;
  })();

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
        ? "w-full flex overflow-x-auto py-6 px-4 space-x-6 min-w-0"
        : "w-full flex overflow-x-auto py-4 px-4 space-x-4 min-w-0";

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

  // Render different layouts
  if (layout === "horizontal") {
    return (
      <>
        {jsonLdData && (
          <Script
            id={
              jsonLdId ||
              (title
                ? `events-around-${title.toLowerCase().replace(/\s+/g, "-")}`
                : "events-around")
            }
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
          />
        )}
        <div className="w-full flex overflow-x-auto py-6 px-4 space-x-6 min-w-0">
          {uniqueEvents.map((event, index) => (
            <div
              // key uses id or slug; index fallback should never be needed due to dedup above
              key={event.id ?? event.slug ?? index}
              className="flex-none w-96 min-w-[24rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer"
            >
              <CardHorizontalServer
                event={event}
                isPriority={usePriority && index <= 2}
              />
            </div>
          ))}
        </div>
      </>
    );
  }

  // Default compact layout - for related events on individual pages (no priority)
  return (
    <>
      {jsonLdData && (
        <Script
          id={
            jsonLdId ||
            (title
              ? `events-around-${title.toLowerCase().replace(/\s+/g, "-")}`
              : "events-around")
          }
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      )}
      <div className="w-full flex overflow-x-auto py-4 px-4 space-x-4 min-w-0">
        {uniqueEvents.map((event, index) => {
          const eventTitle = truncateString(event.title || "", 60);
          const image = event.imageUrl;

          // Format the date
          const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
            event.startDate,
            event.endDate
          );
          const eventDate = formattedEnd
            ? `Del ${formattedStart} al ${formattedEnd}`
            : `${nameDay}, ${formattedStart}`;

          return (
            <div
              key={event.id ?? event.slug ?? index}
              className="flex-none w-40 min-w-[10rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer mb-10"
            >
              <Link href={`/e/${event.slug}`}>
                {/* ImageEvent */}
                <div className="w-full h-32 flex justify-center items-center overflow-hidden">
                  <ImageServer
                    className="w-full object-cover"
                    title={event.title}
                    alt={event.title}
                    image={image}
                    priority={false}
                    context="card"
                  />
                </div>
                {/* Title */}
                <div className="flex pt-2">
                  <div className="pt-[2px] pr-2">
                    <div className="w-2 h-4 bg-gradient-to-r from-primary to-primarydark"></div>
                  </div>
                  <h3 className="text-sm font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
                    {eventTitle}
                  </h3>
                </div>
                {/* Location */}
                <div className="pt-1">
                  <div className="text-xs font-normal text-ellipsis overflow-hidden whitespace-nowrap">
                    <span>{event.location || ""}</span>
                  </div>
                </div>
                {/* Date */}
                <div className="pt-1">
                  <div className="text-xs font-normal text-foreground/80 text-ellipsis overflow-hidden whitespace-nowrap">
                    <span>{eventDate}</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
};

EventsAroundServer.displayName = "EventsAroundServer";

export default memo(EventsAroundServer);
