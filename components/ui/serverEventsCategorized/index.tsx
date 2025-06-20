import { memo, ReactElement } from "react";
import Script from "next/script";
import Link from "next/link"; // Added Link import
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import EventsHorizontalScroll from "@components/ui/eventsHorizontalScroll";
import LocationDiscoveryWidget from "@components/ui/locationDiscoveryWidget";
import { CATEGORY_NAMES_MAP } from "@utils/constants";
import { buildCanonicalUrl } from "@utils/url-filters"; // Added import
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { generateJsonData } from "@utils/helpers";
import { ServerEventsCategorizedProps } from "types/props";

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

  // Generate JSON-LD data for all events (limited to first 50 for performance)
  const jsonEvents = (allEvents as EventSummaryResponseDTO[])
    .slice(0, 50)
    .map((event) => {
      try {
        return generateJsonData(event);
      } catch (err) {
        console.error("Error generating JSON data for event:", event.id, err);
        return null;
      }
    })
    .filter(Boolean);

  if (!hasEvents) {
    return <NoEventsFound />;
  }

  return (
    <>
      {/* JSON-LD Schema for SEO */}
      {jsonEvents.length > 0 && (
        <Script
          id={`categorized-events-${Object.keys(filteredCategorizedEvents).join(
            "-"
          )}-${allEvents.length}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonEvents) }}
        />
      )}

      <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
        <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-8">
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
                // Aggressive Priority logic for fast initial load:
                // First 3 categories get priority to ensure fast visual loading
                // Mobile: 2 categories × 3 images = 6 priority images
                // Desktop: 3 categories × 3 images = 9 priority images
                const shouldUsePriority = index < 3;

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
                      <h2 className="font-semibold">{categoryName}</h2>
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
                          Veure més
                          <ChevronRightIcon className="w-5 h-5" />
                        </div>
                      </Link>
                    </div>

                    {/* Events Horizontal Scroll */}
                    <EventsHorizontalScroll
                      events={events as EventSummaryResponseDTO[]}
                      usePriority={shouldUsePriority}
                    />

                    {/* Ad placement removed for server component - can be added via client component */}
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
