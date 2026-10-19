import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import SectionHeading from "@components/ui/common/SectionHeading";
import { fetchPromotedEvents } from "@lib/api/promotions";
import { getPlaceBySlug } from "@lib/api/places";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { PromotedEventsQuery } from "types/api/promotion";
import type { PromotedEventsSectionProps } from "types/props";

async function toPromotedQuery(
  placeSlug?: string,
): Promise<PromotedEventsQuery | null> {
  if (!placeSlug || placeSlug === "catalunya") return { placement: "CATALONIA" };
  const place = await getPlaceBySlug(placeSlug);
  if (!place) return null;
  if (place.type === "CITY") return { placement: "CITY", cityId: place.id };
  if (place.type === "REGION") return { placement: "REGION", regionId: place.id };
  return { placement: "PROVINCE", provinceId: place.id };
}

export default async function PromotedEventsSection({
  placeSlug,
}: PromotedEventsSectionProps): Promise<JSX.Element | null> {
  const query = await toPromotedQuery(placeSlug);
  const promotedEvents = query ? await fetchPromotedEvents(query) : [];
  if (promotedEvents.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });
  const key = placeSlug ?? "catalunya";

  return (
    <div className="container content-auto-section">
      <section className="py-section-y border-b">
        <SectionHeading title={t("title")} titleClassName="heading-2 text-foreground" />
        <div
          data-analytics-container="true"
          data-analytics-context="promoted_carousel"
          data-analytics-place-slug={key}
        >
          <EventsAroundServer
            events={promotedEvents}
            layout="horizontal"
            usePriority={false}
            title={t("title")}
            jsonLdId={`promoted-events-${key}`}
          />
        </div>
      </section>
    </div>
  );
}
