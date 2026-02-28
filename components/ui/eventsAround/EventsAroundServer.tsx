import CardHorizontalServer from "@components/ui/cardHorizontal/CardHorizontalServer";
import CompactCard from "@components/ui/common/cardContent/CompactCard";
import HorizontalScroll from "@components/ui/common/HorizontalScroll";
import { generateJsonData } from "@utils/schema-helpers";
import type { SchemaOrgEvent } from "types/schema";
import type { EventsAroundLayout, EventsAroundServerProps } from "types/common";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";

function EventCardLoading({ layout }: { layout: EventsAroundLayout }) {
  const isHorizontal = layout === "horizontal";
  return (
    <div className={`rounded-card overflow-hidden bg-background shadow-sm flex flex-col ${isHorizontal ? "w-full" : "w-44 min-w-[11rem]"}`}>
      <div className={`bg-muted animate-fast-pulse ${isHorizontal ? "aspect-[3/2]" : "aspect-[4/3]"}`} />
      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
        <div className="w-2/3 h-3 bg-border/40 rounded animate-fast-pulse" />
        <div className="w-3/4 h-4 bg-border/40 rounded animate-fast-pulse" />
        <div className="w-1/2 h-3 bg-border/40 rounded animate-fast-pulse" />
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
      <div className="w-full flex overflow-x-auto py-element-gap px-section-x gap-3 min-w-0">
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
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const tScroll = await getTranslations({
    locale,
    namespace: "Components.HorizontalScroll",
  });
  const carouselSuffix = t("carouselSuffix");

  const jsonLdBlock = jsonLdData ? (
    <JsonLdServer
      id={
        jsonLdId ||
        (title
          ? `events-around-${title.toLowerCase().replace(/\s+/g, "-")}`
          : "events-around")
      }
      data={jsonLdData}
    />
  ) : null;

  if (layout === "horizontal") {
    return (
      <>
        {jsonLdBlock}
        <HorizontalScroll
          className="py-element-gap px-section-x"
          ariaLabel={title ? `${title} - ${carouselSuffix}` : undefined}
          nudgeOnFirstLoad
          showDesktopArrows
          hintStorageKey={jsonLdId || (title ? `carousel-${title}` : undefined)}
          labels={{ previous: tScroll("previous"), next: tScroll("next") }}
        >
          <div className="flex gap-3">
            {uniqueEvents.map((event, index) => (
              <div
                role="listitem"
                key={event.id ?? event.slug ?? index}
                className="snap-start flex-none w-[75vw] min-w-[75vw] sm:w-64 sm:min-w-[16rem]"
              >
                <CardHorizontalServer
                  event={event}
                  isPriority={usePriority && index <= 2}
                />
              </div>
            ))}
          </div>
        </HorizontalScroll>
      </>
    );
  }

  return (
    <>
      {jsonLdBlock}
      <div className="w-full flex overflow-x-auto py-element-gap px-section-x gap-3 min-w-0">
        {uniqueEvents.map((event, index) => (
          <CompactCard
            key={event.id ?? event.slug ?? index}
            event={event}
            locale={locale}
            tCard={tCard}
            tTime={tTime}
            index={index}
          />
        ))}
      </div>
    </>
  );
}

EventsAroundServer.displayName = "EventsAroundServer";

export default EventsAroundServer;
