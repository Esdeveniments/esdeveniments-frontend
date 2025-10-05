import { memo, ReactElement } from "react";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import { Badge, AdArticle, Text } from "@components/ui/primitives";
import EventsAroundServer from "@components/ui/domain/eventsAround/EventsAroundServer";
import LocationDiscoveryWidget from "@components/ui/domain/locationDiscoveryWidget";
import { CATEGORY_NAMES_MAP } from "@utils/constants";
import { buildCanonicalUrl } from "@utils/url-filters"; // Added import
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import NoEventsFound from "@components/ui/domain/noEventsFound";
import { ServerEventsCategorizedProps } from "types/props";
import { formatCatalanDe } from "@utils/helpers";
import Link from "next/link";

function ServerEventsCategorized({
  categorizedEvents,
  pageData,
  categories,
  nonce = "",
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
    {} as Record<string, ListEvent[]>,
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
      <div className="flex w-full flex-col items-center justify-center overflow-hidden bg-whiteCorp">
        <div className="mt-component-md w-full flex-col items-center justify-center sm:w-[580px] md:w-[768px] lg:w-[1024px]">
          {/* SEO Content */}
          {pageData && (
            <>
              <Text
                as="h1"
                variant="h1"
                className="lg:px-xs mb-component-xs px-component-xs uppercase"
              >
                {pageData.title}
              </Text>
              <Text
                as="h2"
                variant="h2"
                className="lg:px-xs px-component-xs text-left font-normal text-blackCorp"
              >
                {pageData.subTitle}
              </Text>
            </>
          )}

          {/* Location Discovery Widget */}
          <LocationDiscoveryWidget />

          <div className="lg:p-xs p-component-xs">
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
                    (cat) => cat.slug === category || cat.name === category,
                  );
                  categoryName = dynamicCategory?.name || category;
                  // Ensure we use the slug from the dynamicCategory if found, for consistency
                  if (dynamicCategory) categorySlug = dynamicCategory.slug;
                } else {
                  // Fallback to static mapping
                  categoryName =
                    CATEGORY_NAMES_MAP[
                      category as keyof typeof CATEGORY_NAMES_MAP
                    ] || category;
                }

                // Build natural Catalan phrasing for headers/CTA
                const normalizedName = (categoryName || "").toLowerCase();
                const isGentGran =
                  categorySlug === "gent-gran" ||
                  normalizedName.includes("gent gran");
                const headerCategoryPhrase = isGentGran
                  ? `per a la ${normalizedName}`
                  : formatCatalanDe(categoryName);

                return (
                  <div key={categorySlug}>
                    {/* Category Header */}
                    <div className="flex justify-between">
                      <Text as="h3" variant="h3" className="font-semibold">
                        Què hi ha {headerCategoryPhrase} a Catalunya?
                      </Text>
                      <Link
                        href={buildCanonicalUrl(
                          {
                            place: "catalunya",
                            byDate: "tots",
                            category: categorySlug,
                          },
                          categories,
                        )}
                        className="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent dark:hover:bg-accent/50 inline-flex h-9 flex-shrink-0 items-center justify-center gap-component-xs whitespace-nowrap rounded-md px-component-md py-component-xs font-medium text-primary outline-none transition-all hover:text-primary/80 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-component-sm"
                      >
                        <Text variant="body-sm" className="flex items-center">
                          Veure més
                          <ChevronRightIcon className="ml-xs h-5 w-5" />
                        </Text>
                      </Link>
                    </div>

                    {/* Related canonical links for this category */}
                    <nav
                      aria-label="Vegeu també"
                      className="mb-component-xs mt-component-xs"
                    >
                      <ul className="flex gap-component-sm text-body-sm">
                        <li>
                          <Badge
                            href={buildCanonicalUrl(
                              {
                                place: "catalunya",
                                byDate: "avui",
                                category: categorySlug,
                              },
                              categories,
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
                              categories,
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
                      nonce={nonce}
                    />

                    {/* Ad placement between category sections */}
                    {adPositions.has(index) && (
                      <div className="mb-component-xs mt-component-md flex h-full min-h-[250px] w-full max-w-lg flex-col items-start gap-component-xs">
                        <div className="flex w-full">
                          <SpeakerphoneIcon className="mr-component-xs mt-component-xs h-5 w-5" />
                          <div className="flex w-11/12 flex-col gap-component-md">
                            <Text as="h3" variant="h3">
                              Contingut patrocinat
                            </Text>
                          </div>
                        </div>
                        <div className="w-full">
                          <AdArticle slot="8139041285" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(ServerEventsCategorized);
