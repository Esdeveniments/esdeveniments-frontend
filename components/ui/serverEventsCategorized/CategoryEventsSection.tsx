import ChevronRightIcon from "@heroicons/react/solid/esm/ChevronRightIcon";
import SpeakerphoneIcon from "@heroicons/react/outline/esm/SpeakerphoneIcon";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import AdArticle from "@components/ui/adArticle";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { buildCanonicalUrl } from "@utils/url-filters";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
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
          className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
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
        layout="horizontal"
        usePriority={shouldUsePriority}
        showJsonLd
        title={categoryName}
        jsonLdId={`category-events-${categorySlug}`}
        useDetailTimeFormat={true}
      />

      {showAd && (
        <div className="w-full flex flex-col items-start mt-element-gap mb-element-gap-sm max-w-lg">
          <div className="flex items-center gap-2 mb-element-gap">
            <SpeakerphoneIcon className="w-5 h-5 text-foreground-strong flex-shrink-0" />
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
