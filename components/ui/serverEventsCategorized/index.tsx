import { memo, ReactElement } from "react";
import Link from "next/link"; // Added Link import
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
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
      <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
        <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-4">
          {/* SEO Content */}
          {pageData && (
            <>
              <h1 className="uppercase mb-2 px-2 lg:px-0">{pageData.title}</h1>
              <p className="text-[16px] font-normal text-blackCorp text-left px-2 lg:px-0 font-barlow">
                {pageData.subTitle}
              </p>
            </>
          )}

          {/* Location Discovery Widget */}
          <LocationDiscoveryWidget />

          <div className="p-2 lg:p-0">
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

                return (
                  <div key={categorySlug}>
                    {/* Category Header */}
                    <div className="flex justify-between">
                      <h3 className="font-semibold">
                        Agenda {formatCatalanDe(categoryName)} a Catalunya
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
                        className="flex justify-between items-center cursor-pointer text-primary"
                      >
                        <div className="flex items-center">
                          Veure més esdeveniments{" "}
                          {formatCatalanDe(categoryName)}
                          <ChevronRightIcon className="w-5 h-5" />
                        </div>
                      </Link>
                    </div>

                    {/* Events Horizontal Scroll */}
                    <EventsAroundServer
                      events={events as EventSummaryResponseDTO[]}
                      layout="horizontal"
                      usePriority={shouldUsePriority}
                      showJsonLd={true}
                      title={categoryName}
                      jsonLdId={`category-events-${categoryName}-${events.length}`}
                      nonce={nonce}
                    />

                    {/* Ad placement between category sections */}
                    {adPositions.has(index) && (
                      <div className="w-full h-full flex flex-col items-start min-h-[250px] max-w-lg gap-2 mt-4 mb-2">
                        <div className="w-full flex">
                          <SpeakerphoneIcon className="w-5 h-5 mt-1 mr-2" />
                          <div className="w-11/12 flex flex-col gap-4">
                            <h2>Contingut patrocinat</h2>
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
      </div>
    </>
  );
}

export default memo(ServerEventsCategorized);
