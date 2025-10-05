import { memo, FC } from "react";
import Script from "next/script";
import { Skeleton, Card } from "@components/ui/primitives";
import { generateJsonData } from "@utils/schema-helpers";
import type { SchemaOrgEvent } from "types/schema";
import type { EventsAroundServerProps } from "types/common";
import { siteUrl } from "@config/index";

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
            err,
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
        ? "w-full flex overflow-x-auto py-component-lg px-component-md space-x-6 min-w-0"
        : "w-full flex overflow-x-auto py-component-md px-component-md space-x-4 min-w-0";

    return (
      <div className={containerClass}>
        <Skeleton
          variant="card"
          className={layout === "horizontal" ? "h-48 w-96" : "h-32 w-40"}
        />
        <Skeleton
          variant="card"
          className={layout === "horizontal" ? "h-48 w-96" : "h-32 w-40"}
        />
        <Skeleton
          variant="card"
          className={layout === "horizontal" ? "h-48 w-96" : "h-32 w-40"}
        />
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
        <div className="flex w-full min-w-0 space-x-6 overflow-x-auto px-component-md py-component-lg">
          {uniqueEvents.map((event, index) => (
            <Card
              type="event"
              key={event.id ?? event.slug ?? index}
              event={event}
              variant="horizontal"
              isPriority={usePriority && index <= 2}
              className="w-96 min-w-[24rem] flex-none"
            />
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
      <div className="flex w-full min-w-0 space-x-4 overflow-x-auto px-component-md py-component-md">
        {uniqueEvents.map((event, index) => (
          <Card
            type="event"
            key={event.id ?? event.slug ?? index}
            event={event}
            variant="compact"
            isPriority={false}
          />
        ))}
      </div>
    </>
  );
};

EventsAroundServer.displayName = "EventsAroundServer";

export default memo(EventsAroundServer);
