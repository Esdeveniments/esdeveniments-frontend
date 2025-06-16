import { memo, ReactElement } from "react";
import Script from "next/script";
import Link from "next/link"; // Added Link import
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import EventsHorizontalScroll from "@components/ui/eventsHorizontalScroll";
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

      {/* SEO Content */}
      {pageData && (
        <div className="w-full px-4 mb-6 max-w-4xl mx-auto mt-32">
          <h1 className="text-2xl font-bold mb-2">{pageData.title}</h1>
          <p className="text-gray-700 leading-relaxed">{pageData.subTitle}</p>
        </div>
      )}

      <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
        <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
          {Object.entries(filteredCategorizedEvents).map(
            ([category, events]) => {
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
                <div
                  key={categorySlug} // Use categorySlug for the key
                  className="w-full flex flex-col justify-center items-center gap-4"
                >
                  {/* Category Header */}
                  <div className="w-full flex justify-between items-center px-4">
                    <h2 className="text-xl font-bold capitalize">
                      {categoryName}
                    </h2>
                    <Link
                      href={buildCanonicalUrl(
                        {
                          place: "catalunya",
                          byDate: "tots",
                          category: categorySlug,
                        },
                        categories
                      )}
                      className="text-sm text-primary hover:underline flex items-center"
                    >
                      Veure més
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </Link>
                  </div>

                  {/* Events Horizontal Scroll */}
                  <EventsHorizontalScroll
                    events={events as EventSummaryResponseDTO[]}
                  />

                  {/* Ad placement removed for server component - can be added via client component */}
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
