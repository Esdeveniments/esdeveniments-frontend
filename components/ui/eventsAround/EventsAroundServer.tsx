import CardContentServer from "@components/ui/common/cardContent/CardContentServer";
import HorizontalScroll from "@components/ui/common/HorizontalScroll";
import { buildEventListItems } from "@utils/schema-helpers";
import type { EventsAroundServerProps } from "types/common";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";

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
  usePriority = false,
  showJsonLd = false,
  jsonLdId,
  title,
}: EventsAroundServerProps) {
  const locale = (await rootLocale()) as AppLocale;
  const uniqueEvents = dedupeEvents(events);

  const generateJsonLdData = () => {
    if (!showJsonLd || uniqueEvents.length === 0) return null;

    const items = buildEventListItems(uniqueEvents.slice(0, 10), locale);

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${siteUrl}#itemlist-${title?.toLowerCase().replace(/\s+/g, "-")}`,
      name: title || "Related Events",
      numberOfItems: items.length,
      itemListElement: items,
    };
  };

  const jsonLdData = generateJsonLdData();

  if (uniqueEvents.length === 0) {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "Components.EventsAround" });
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
        <div className="flex gap-element-gap">
          {uniqueEvents.map((event, index) => (
            <div
              role="listitem"
              key={event.id ?? event.slug ?? index}
              className="snap-start flex-none w-[75vw] min-w-[75vw] sm:w-64 sm:min-w-[16rem]"
            >
              <CardContentServer
                event={event}
                compact
                locale={locale}
                isPriority={usePriority && index <= 2}
              />
            </div>
          ))}
        </div>
      </HorizontalScroll>
    </>
  );
}

EventsAroundServer.displayName = "EventsAroundServer";

export default EventsAroundServer;
