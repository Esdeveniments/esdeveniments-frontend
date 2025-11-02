import { memo, ReactElement } from "react";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import Badge from "@components/ui/common/badge";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import LocationDiscoveryWidget from "@components/ui/locationDiscoveryWidget";
import AdArticle from "@components/ui/adArticle";
import { CATEGORY_NAMES_MAP } from "@utils/constants";
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
              <h1 className="uppercase mb-2">{pageData.title}</h1>
              <h2 className="font-normal text-foreground text-left">
                {pageData.subTitle}
              </h2>
            </>
          )}

          {/* Location Discovery Widget */}
          <LocationDiscoveryWidget />
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
                    <h3 className="font-semibold">
                      Què hi ha {headerCategoryPhrase} a Catalunya?
                    </h3>
                    <Link
                      href={buildCanonicalUrl(
                        {
                          place: "catalunya",
                          byDate: "tots",
                          category: categorySlug,
                        },
                        categories
                      )}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent dark:hover:bg-accent/50 h-9 px-4 py-2 has-[>svg]:px-3 text-primary hover:text-primary/80 gap-2 flex-shrink-0"
                    >
                      <span className="flex items-center">
                        Veure més
                        <ChevronRightIcon className="w-5 h-5 ml-1" />
                      </span>
                    </Link>
                  </div>

                  {/* Related canonical links for this category */}
                  <nav aria-label="Vegeu també" className="mt-element-gap-sm mb-element-gap-sm">
                    <ul className="flex gap-element-gap text-sm">
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
                    nonce={nonce}
                  />

                  {/* Ad placement between category sections */}
                  {adPositions.has(index) && (
                    <div className="w-full h-full flex flex-col items-start min-h-[250px] max-w-lg gap-element-gap mt-element-gap mb-element-gap-sm">
                      <div className="w-full flex">
                        <SpeakerphoneIcon className="w-5 h-5 mt-1 mr-2" />
                        <div className="stack w-11/12">
                          <h3>Contingut patrocinat</h3>
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
