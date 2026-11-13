import { getTranslations } from "next-intl/server";
import { fetchEventsCached } from "@lib/api/events";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import { formatPlacePreposition } from "@utils/string-helpers";
import { getCategoryLabel } from "@utils/category-helpers";
import { getLocaleSafely } from "@utils/i18n-seo";
import { TOWN_TEST_MIN_EVENTS } from "@config/town-seo-test";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { TownGuideProps } from "types/props";

const TOP_CATEGORIES = 3;
const REGION_EVENTS_LIMIT = 8;

function topCategories(
  events: EventSummaryResponseDTO[],
  label: (slug: string, name: string) => string,
): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const category of events.flatMap((e) => e.categories ?? [])) {
    const entry = counts.get(category.slug);
    if (entry) entry.count += 1;
    else counts.set(category.slug, { name: category.name, count: 1 });
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_CATEGORIES)
    .map(([slug, { name }]) => label(slug, name));
}

async function fetchRegionEvents(
  regionSlug: string,
  townEvents: EventSummaryResponseDTO[],
): Promise<EventSummaryResponseDTO[]> {
  const shown = new Set(townEvents.map((e) => e.id));
  const response = await fetchEventsCached({
    page: 0,
    size: REGION_EVENTS_LIMIT + shown.size,
    place: regionSlug,
  });
  return (response?.content ?? [])
    .filter((e) => !shown.has(e.id))
    .slice(0, REGION_EVENTS_LIMIT);
}

/**
 * Town-page test, group B (config/town-seo-test.ts): a short guide built from
 * the town's own data, plus comarca events when the town has a few of its own.
 * With none, the list above already shows the comarca fallback.
 */
export default async function TownGuide({
  placeLabel,
  regionLabel,
  regionSlug,
  events,
  totalEvents,
}: TownGuideProps) {
  const locale = await getLocaleSafely();
  const townEvents =
    totalEvents > 0 ? events.filter(isEventSummaryResponseDTO) : [];
  const needsRegionEvents =
    !!regionSlug && totalEvents > 0 && totalEvents < TOWN_TEST_MIN_EVENTS;
  const [t, tCategories, regionEvents] = await Promise.all([
    getTranslations({ locale, namespace: "Components.TownGuide" }),
    getTranslations({ locale, namespace: "Config.Categories" }),
    needsRegionEvents
      ? fetchRegionEvents(regionSlug, townEvents)
      : Promise.resolve([]),
  ]);

  const placeIn = formatPlacePreposition(placeLabel, "town", locale, false);
  const placeOf = formatPlacePreposition(placeLabel, "town", locale, false, "of");
  const regionIn = regionLabel
    ? formatPlacePreposition(regionLabel, "region", locale, false)
    : null;
  const categories = topCategories(townEvents, (slug, name) =>
    getCategoryLabel(slug, name, tCategories),
  );

  return (
    <section className="container border-t border-border/40 py-section-y stack">
      <h2 className="heading-2">{t("title", { placeOf })}</h2>
      <p className="body-normal text-foreground">
        {t("summary", { count: totalEvents, placeIn })}
        {categories.length > 0 &&
          ` ${t("categories", {
            categories: new Intl.ListFormat(locale, {
              type: "conjunction",
            }).format(categories),
          })}`}
        {regionIn && ` ${t("region", { place: placeLabel, regionIn })}`}
      </p>
      {regionIn && regionEvents.length > 0 && (
        <EventsAroundSection
          events={regionEvents}
          title={t("regionEvents", { regionIn })}
          bleed
        />
      )}
    </section>
  );
}
