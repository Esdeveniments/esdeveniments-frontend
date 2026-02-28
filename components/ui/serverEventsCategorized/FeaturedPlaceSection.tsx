import { getTranslations } from "next-intl/server";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { buildCanonicalUrl } from "@utils/url-filters";
import {
  createDateFilterBadgeLabels,
  DateFilterBadges,
} from "./DateFilterBadges";
import type { FeaturedPlaceConfig } from "types/props";
import type { EventSummaryResponseDTO } from "types/api/event";

export async function FeaturedPlaceSection({
  section,
}: {
  section: FeaturedPlaceConfig & {
    events: EventSummaryResponseDTO[];
    placeSlug: string;
    usePriority: boolean;
  };
}) {
  const t = await getTranslations("Components.FeaturedPlaceSection");
  const tDateFilters = await getTranslations("Components.DateFilterBadges");
  const badgeLabels = createDateFilterBadgeLabels(tDateFilters);
  return (
    <section className="py-section-y border-b">
      <div className="flex-between gap-element-gap">
        <div className="stack gap-1">
          <h2 className="heading-2">{section.title}</h2>
          {section.subtitle && (
            <p className="body-small text-muted-foreground">{section.subtitle}</p>
          )}
        </div>
        <PressableAnchor
          href={buildCanonicalUrl({ place: section.placeSlug })}
          className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
          prefetch={false}
          variant="inline"
        >
          {t("seeMore")}
          <ChevronRightIcon className="w-5 h-5" />
        </PressableAnchor>
      </div>

      <DateFilterBadges
        placeSlug={section.placeSlug}
        contextName={section.title}
        ariaLabel={t("aria", { title: section.title })}
        labels={badgeLabels}
      />

      <EventsAroundServer
        events={section.events}
        layout="horizontal"
        usePriority={section.usePriority}
        showJsonLd
        title={section.title}
        jsonLdId={`featured-events-${section.slug}`}
      />
    </section>
  );
}
