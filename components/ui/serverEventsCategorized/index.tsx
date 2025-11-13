import { memo, ReactElement, Suspense } from "react";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import Badge from "@components/ui/common/badge";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import LocationDiscoveryWidget from "@components/ui/locationDiscoveryWidget";
import AdArticle from "@components/ui/adArticle";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import { buildCanonicalUrl } from "@utils/url-filters"; // Added import
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { ServerEventsCategorizedProps } from "types/props";
import { formatCatalanDe } from "@utils/helpers";
import Link from "next/link";

function ServerEventsCategorized({
  categorizedEvents,
  pageData,
  categories,
}: ServerEventsCategorizedProps): ReactElement {
  // Filter out ads before processing
  const filteredCategorizedEvents = Object.entries(categorizedEvents).reduce(
    (acc, [category, events]) => {
      const filteredEvents = events.filter(isEventSummaryResponseDTO);
      if (filteredEvents.length > 0) {
        acc[category] = filteredEvents;
      }
      return acc;
    },
    {} as Record<string, ListEvent[]>
  );

  const allEvents = Object.values(filteredCategorizedEvents).flat();
  const hasEvents = allEvents.length > 0;

  // Pre-calculate ad placement positions for better performance
  const totalCategories = Object.keys(filteredCategorizedEvents).length;
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
        <div className="container mt-element-gap">
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
          <Suspense
            fallback={
              <div className="w-full h-12 bg-background animate-pulse rounded-full" />
            }
          >
            <LocationDiscoveryWidget />
          </Suspense>
        </div>

        <div className="container">
          {Object.entries(filteredCategorizedEvents).map(
            ([category, events], index) => {
              // Conservative priority logic for homepage main content:
              // Only first 2 categories get priority to balance performance
              // This gives priority to ~6 images (2 categories × 3 images each)
              const shouldUsePriority = index < 2;

              // Try to get category name from dynamic categories first, fallback to static mapping
              let categoryName: string;
              let categorySlug = category; // Use the key from categorizedEvents as the slug

              if (categories) {
                const dynamicCategory = categories.find(
                  (cat) => cat.slug === category || cat.name === category
                );
                categoryName = dynamicCategory?.name || category;
                // Ensure we use the slug from the dynamicCategory if found, for consistency
                if (dynamicCategory) categorySlug = dynamicCategory.slug;
              } else {
                // Fallback: format slug as readable name
                categoryName =
                  category.charAt(0).toUpperCase() +
                  category.slice(1).replace(/-/g, " ");
              }

              // Build natural Catalan phrasing: "L'agenda de/del/d'/de la [category]"
              const categoryPhrase = formatCatalanDe(categoryName, true, true);

              return (
                <div key={categorySlug}>
                  {/* Category Header */}
                  <div className="flex justify-between items-center">
                    <h3 className="heading-3">
                      L&apos;agenda {categoryPhrase} a Catalunya
                    </h3>
                    <Link
                      href={buildCanonicalUrl(
                        {
                          place: "catalunya",
                          byDate: DEFAULT_FILTER_VALUE,
                          category: categorySlug,
                        },
                        categories
                      )}
                      className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
                    >
                      Veure més
                      <ChevronRightIcon className="w-5 h-5" />
                    </Link>
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
                              category: categorySlug,
                            },
                            categories
                          )}
                          ariaLabel={`Veure activitats d'avui per la categoria ${categoryName}`}
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
                              category: categorySlug,
                            },
                            categories
                          )}
                          ariaLabel={`Veure activitats aquest cap de setmana per la categoria ${categoryName}`}
                        >
                          Cap de setmana
                        </Badge>
                      </li>
                    </ul>
                  </nav>

                  {/* Events Horizontal Scroll */}
                  <EventsAroundServer
                    events={events as EventSummaryResponseDTO[]}
                    layout="horizontal"
                    usePriority={shouldUsePriority}
                    showJsonLd={true}
                    title={categoryName}
                    jsonLdId={`category-events-${categorySlug}`}
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
                </div>
              );
            }
          )}
        </div>
      </div>
    </>
  );
}

export default memo(ServerEventsCategorized);
