import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
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
  const locale = await getLocaleSafely();
  const [t, tDateFilters] = await Promise.all([
    getTranslations({ locale, namespace: "Components.FeaturedPlaceSection" }),
    getTranslations({ locale, namespace: "Components.DateFilterBadges" }),
  ]);
  const badgeLabels = createDateFilterBadgeLabels(tDateFilters, locale);
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
        contextName={section.placeLabel}
        placeType={section.filter.city ? "town" : section.filter.region ? "region" : ""}
        ariaLabel={t("aria", { title: section.title })}
        labels={badgeLabels}
      />

      <EventsAroundServer
        events={section.events}
        usePriority={section.usePriority}
        showJsonLd
        title={section.title}
        jsonLdId={`featured-events-${section.slug}`}
      />
    </section>
  );
}
