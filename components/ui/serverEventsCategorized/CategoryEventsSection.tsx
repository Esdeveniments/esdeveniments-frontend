import { ChevronRightIcon } from "@heroicons/react/24/solid";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import AdArticle from "@components/ui/adArticle";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { buildCanonicalUrl } from "@utils/url-filters";
import { DEFAULT_FILTER_VALUE, SEE_ALL_LINK_CLASS } from "@utils/constants";
import { DateFilterBadges } from "./DateFilterBadges";
import type { CategoryEventsSectionProps } from "types/props";

export function CategoryEventsSection({
  events,
  categoryName,
  categorySlug,
  categoryPhrase: _categoryPhrase,
  categories,
  shouldUsePriority,
  showAd,
  labels,
  badgeLabels,
}: CategoryEventsSectionProps) {
  return (
    <section className="py-section-y border-b">
      <div className="flex justify-between items-center">
        <h2 className="heading-2">{labels.heading}</h2>
        <PressableAnchor
          href={buildCanonicalUrl(
            {
              place: "catalunya",
              byDate: DEFAULT_FILTER_VALUE,
              category: categorySlug,
            },
            categories
          )}
          className={SEE_ALL_LINK_CLASS}
          prefetch={false}
          variant="inline"
        >
          {labels.seeMore} <ChevronRightIcon className="w-5 h-5" />
        </PressableAnchor>
      </div>

      <DateFilterBadges
        placeSlug="catalunya"
        categorySlug={categorySlug}
        categories={categories}
        contextName={categoryName}
        labels={badgeLabels}
      />

      <EventsAroundServer
        events={events}
        usePriority={shouldUsePriority}
        showJsonLd
        title={categoryName}
        jsonLdId={`category-events-${categorySlug}`}
      />

      {showAd && (
        <div className="w-full flex flex-col items-start mt-element-gap mb-element-gap-sm max-w-lg">
          <div className="mb-element-gap">
            <h2 className="heading-2">{labels.sponsored}</h2>
          </div>
          <div className="w-full">
            <AdArticle slot="8139041285" />
          </div>
        </div>
      )}
    </section>
  );
}
