import { memo } from "react";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import Badge from "@components/ui/common/badge";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import LocationDiscoveryWidget from "@components/ui/locationDiscoveryWidget";
import AdArticle from "@components/ui/adArticle";
import { fetchEvents } from "@lib/api/events";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import { buildCanonicalUrl } from "@utils/url-filters"; // Added import
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import NoEventsFound from "@components/ui/common/noEventsFound";
import type {
  FeaturedPlaceConfig,
  ServerEventsCategorizedProps,
} from "types/props";
import { formatCatalanDe } from "@utils/helpers";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { computeTemporalStatus } from "@utils/event-status";

import type { CategorySummaryResponseDTO } from "types/api/category";

const PRIORITY_CATEGORY_SLUGS = [
  "festes-populars",
  "fires-i-mercats",
  "familia-i-infants",
  "musica",
  "teatre",
] as const;

const PRIORITY_CATEGORY_ORDER_ENTRIES: [string, number][] =
  PRIORITY_CATEGORY_SLUGS.map((slug, index) => [slug, index]);

const PRIORITY_CATEGORY_ORDER = new Map<string, number>(
  PRIORITY_CATEGORY_ORDER_ENTRIES
);

const resolveCategoryDetails = (
  categoryKey: string,
  firstEvent: EventSummaryResponseDTO | undefined,
  allCategories: CategorySummaryResponseDTO[] | undefined
): { categoryName: string; categorySlug: string } => {
  const safeToLowerCase = (value: unknown): string => {
    if (typeof value !== "string" || !value) return "";
    return value.toLowerCase();
  };

  const normalizedKey = safeToLowerCase(categoryKey);

  // Helper function to find a matching category in an array
  const findMatchingCategory = (
    categories: Array<{ name?: string; slug?: string }>
  ): { name: string; slug: string } | undefined => {
    const found = categories.find((cat) => {
      if (!cat?.name || !cat.slug) return false;
      const catName = safeToLowerCase(cat.name);
      const catSlug = safeToLowerCase(cat.slug);
      return catName === normalizedKey || catSlug === normalizedKey;
    });
    // Type guard: we know name and slug exist because of the check above
    if (found?.name && found.slug) {
      return { name: found.name, slug: found.slug };
    }
    return undefined;
  };

  if (firstEvent?.categories?.length) {
    const matchingCategory = findMatchingCategory(firstEvent.categories);

    if (matchingCategory) {
      return {
        categoryName: matchingCategory.name,
        categorySlug: matchingCategory.slug,
      };
    }

    const firstValid = firstEvent.categories.find(
      (cat) => cat?.name && cat.slug
    );
    if (firstValid) {
      return {
        categoryName: firstValid.name,
        categorySlug: firstValid.slug,
      };
    }
  }

  if (allCategories?.length) {
    const matchingCategory = findMatchingCategory(allCategories);

    if (matchingCategory) {
      return {
        categoryName: matchingCategory.name,
        categorySlug: matchingCategory.slug,
      };
    }
  }

  const safeCategory = typeof categoryKey === "string" ? categoryKey : "";
  const categoryName =
    safeCategory.length > 0
      ? safeCategory.charAt(0).toUpperCase() +
        safeCategory.slice(1).replace(/-/g, " ")
      : "";
  return {
    categoryName,
    categorySlug: safeCategory,
  };
};

function ServerEventsCategorized(props: ServerEventsCategorizedProps) {
  return <ServerEventsCategorizedContent {...props} />;
}

export async function ServerEventsCategorizedContent({
  categorizedEventsPromise,
  pageData,
  categoriesPromise,
  featuredPlaces,
}: ServerEventsCategorizedProps) {
  const [categorizedEvents, categories] = await Promise.all([
    categorizedEventsPromise,
    categoriesPromise || Promise.resolve<CategorySummaryResponseDTO[]>([]),
  ]);

  const featuredSections = featuredPlaces
    ? (
        await Promise.all(
          featuredPlaces.map(async (placeConfig, index) => {
            const placeSlug =
              placeConfig.filter.city ||
              placeConfig.filter.region ||
              placeConfig.filter.place ||
              placeConfig.slug;

            if (!placeSlug) return null;

            const response = await fetchEvents({
              place: placeSlug,
              page: 0,
              size: 6,
            });

            const events = response.content
              .filter(isEventSummaryResponseDTO)
              .filter((event) => {
                const status = computeTemporalStatus(
                  event.startDate,
                  event.endDate,
                  undefined,
                  event.startTime,
                  event.endTime
                );
                return status.state !== "past";
              });

            if (events.length === 0) {
              return null;
            }

            return {
              ...placeConfig,
              events,
              placeSlug,
              usePriority: index < 2,
            };
          })
        )
      ).filter(
        (
          section
        ): section is FeaturedPlaceConfig & {
          events: EventSummaryResponseDTO[];
          placeSlug: string;
          usePriority: boolean;
        } => section !== null
      )
    : [];

  // Filter out ads and past events before processing
  const filteredCategorizedEvents = Object.entries(categorizedEvents).reduce(
    (acc, [category, events]) => {
      const realEvents = events.filter(isEventSummaryResponseDTO);
      // Filter out past events
      const activeEvents = realEvents.filter((event) => {
        const status = computeTemporalStatus(
          event.startDate,
          event.endDate,
          undefined,
          event.startTime,
          event.endTime
        );
        return status.state !== "past";
      });
      if (activeEvents.length > 0) {
        acc[category] = activeEvents;
      }
      return acc;
    },
    {} as Record<string, ListEvent[]>
  );

  const categorySections = Object.entries(filteredCategorizedEvents).map(
    ([category, events]) => {
      const typedEvents = events as EventSummaryResponseDTO[];
      const firstEvent = typedEvents.find(isEventSummaryResponseDTO);
      const { categoryName, categorySlug } = resolveCategoryDetails(
        category,
        firstEvent,
        categories
      );
      const normalizedSlug = categorySlug?.toLowerCase() ?? "";
      return {
        key: category,
        events: typedEvents,
        categoryName,
        categorySlug,
        normalizedSlug,
        categoryPhrase: formatCatalanDe(categoryName, true, true),
      };
    }
  );

  const prioritizedCategorySections = categorySections
    .filter(
      (section) =>
        section.normalizedSlug &&
        PRIORITY_CATEGORY_ORDER.has(section.normalizedSlug)
    )
    .sort(
      (a, b) =>
        (PRIORITY_CATEGORY_ORDER.get(a.normalizedSlug) ??
          Number.MAX_SAFE_INTEGER) -
        (PRIORITY_CATEGORY_ORDER.get(b.normalizedSlug) ??
          Number.MAX_SAFE_INTEGER)
    );

  const categorySectionsToRender =
    prioritizedCategorySections.length > 0
      ? prioritizedCategorySections
      : categorySections;

  const hasEvents = categorySectionsToRender.length > 0;

  // Pre-calculate ad placement positions for better performance
  const totalCategories = categorySectionsToRender.length;
  const adPositions = new Set<number>();

  // Add ads starting from index 1 (after 2nd category) and then every 3rd category
  for (let i = 1; i < totalCategories; i += 3) {
    adPositions.add(i);
  }

  // Always show ad after the last category if we have more than 3 categories
  if (totalCategories > 3) {
    adPositions.add(totalCategories - 1);
  }

  if (!hasEvents) {
    return <NoEventsFound />;
  }

  return (
    <>
      <div className="w-full bg-background overflow-hidden">
        <div className="container pt-section-y">
          {/* SEO Content */}
          {pageData && (
            <>
              <h1 className="heading-1 mb-2">{pageData.title}</h1>
              <h2 className="heading-2 text-foreground text-left">
                {pageData.subTitle}
              </h2>
            </>
          )}

          {/* Location Discovery Widget */}
          <LocationDiscoveryWidget />
        </div>

        {featuredSections.length > 0 && (
          <div className="container">
            {featuredSections.map((section) => (
              <section
                key={section.slug}
                className="py-section-y border-b border-border first:pt-section-y"
              >
                <div className="flex-between gap-element-gap">
                  <div className="stack gap-1">
                    <h3 className="heading-3">{section.title}</h3>
                    {section.subtitle ? (
                      <p className="body-small text-foreground/70">
                        {section.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <PressableAnchor
                    href={`/${section.slug}`}
                    className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
                    prefetch={false}
                    variant="inline"
                  >
                    Veure més
                    <ChevronRightIcon className="w-5 h-5" />
                  </PressableAnchor>
                </div>

                <nav
                  aria-label={`Explora ${section.title} per data`}
                  className="mt-element-gap-sm mb-element-gap-sm"
                >
                  <ul className="flex gap-element-gap">
                    <li>
                      <Badge
                        href={`/${section.slug}/avui`}
                        ariaLabel={`Veure activitats d'avui a ${section.title}`}
                      >
                        Avui
                      </Badge>
                    </li>
                    <li>
                      <Badge
                        href={`/${section.slug}/dema`}
                        ariaLabel={`Veure activitats de demà a ${section.title}`}
                      >
                        Demà
                      </Badge>
                    </li>
                    <li>
                      <Badge
                        href={`/${section.slug}/cap-de-setmana`}
                        ariaLabel={`Veure activitats aquest cap de setmana a ${section.title}`}
                      >
                        Cap de setmana
                      </Badge>
                    </li>
                  </ul>
                </nav>

                <EventsAroundServer
                  events={section.events}
                  layout="horizontal"
                  usePriority={Boolean(section.usePriority)}
                  showJsonLd
                  title={section.title}
                  jsonLdId={`featured-events-${section.slug}`}
                />
              </section>
            ))}
          </div>
        )}

        <div className="container">
          {categorySectionsToRender.map((section, index) => {
            // Conservative priority logic for homepage main content:
            // Only first 2 categories get priority to balance performance
            // This gives priority to ~6 images (2 categories × 3 images each)
            const shouldUsePriority = index < 2;

            return (
              <section
                key={section.key}
                className="py-section-y border-b border-border first:pt-section-y"
              >
                {/* Category Header */}
                <div className="flex justify-between items-center">
                  <h3 className="heading-3">
                    L&apos;agenda {section.categoryPhrase} a Catalunya
                  </h3>
                  <PressableAnchor
                    href={buildCanonicalUrl(
                      {
                        place: "catalunya",
                        byDate: DEFAULT_FILTER_VALUE,
                        category: section.categorySlug,
                      },
                      categories
                    )}
                    className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
                    prefetch={false}
                    variant="inline"
                  >
                    Veure més
                    <ChevronRightIcon className="w-5 h-5" />
                  </PressableAnchor>
                </div>

                {/* Related canonical links for this category */}
                <nav
                  aria-label="Vegeu també"
                  className="mt-element-gap-sm mb-element-gap-sm"
                >
                  <ul className="flex gap-element-gap">
                    <li>
                      <Badge
                        href={buildCanonicalUrl(
                          {
                            place: "catalunya",
                            byDate: "avui",
                            category: section.categorySlug,
                          },
                          categories
                        )}
                        ariaLabel={`Veure activitats d'avui per la categoria ${section.categoryName}`}
                      >
                        Avui
                      </Badge>
                    </li>
                    <li>
                      <Badge
                        href={buildCanonicalUrl(
                          {
                            place: "catalunya",
                            byDate: "cap-de-setmana",
                            category: section.categorySlug,
                          },
                          categories
                        )}
                        ariaLabel={`Veure activitats aquest cap de setmana per la categoria ${section.categoryName}`}
                      >
                        Cap de setmana
                      </Badge>
                    </li>
                  </ul>
                </nav>

                {/* Events Horizontal Scroll */}
                <EventsAroundServer
                  events={section.events}
                  layout="horizontal"
                  usePriority={shouldUsePriority}
                  showJsonLd={true}
                  title={section.categoryName}
                  jsonLdId={`category-events-${section.categorySlug}`}
                />

                {/* Ad placement between category sections */}
                {adPositions.has(index) && (
                  <div className="w-full h-full flex flex-col items-start min-h-[250px] max-w-lg gap-element-gap mt-element-gap mb-element-gap-sm">
                    <div className="w-full flex">
                      <SpeakerphoneIcon className="w-5 h-5 mt-1 mr-2" />
                      <div className="stack w-11/12">
                        <h3 className="heading-3">Contingut patrocinat</h3>
                      </div>
                    </div>
                    <div className="w-full">
                      <AdArticle slot="8139041285" />
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default memo(ServerEventsCategorized);
