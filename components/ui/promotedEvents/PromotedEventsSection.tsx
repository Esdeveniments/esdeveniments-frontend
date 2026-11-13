import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import SectionHeading from "@components/ui/common/SectionHeading";
import PromotedEventsTracker from "@components/ui/promotedEvents/PromotedEventsTracker";
import { fetchPromotedEvents } from "@lib/api/promotions";
import { getPlaceBySlug } from "@lib/api/places";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { PromotedEventsQuery } from "types/api/promotion";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { PromotedEventsRowProps, PromotedEventsSectionProps } from "types/props";

async function toPromotedQuery(
  placeSlug?: string,
): Promise<PromotedEventsQuery | null> {
  if (!placeSlug || placeSlug === "catalunya") return { placement: "CATALONIA" };
  // The section is optional: a failed place lookup hides it, never the page.
  const place = await getPlaceBySlug(placeSlug).catch(() => null);
  if (!place) return null;
  if (place.type === "CITY") return { placement: "CITY", cityId: place.id };
  if (place.type === "REGION") return { placement: "REGION", regionId: place.id };
  return { placement: "PROVINCE", provinceId: place.id };
}

/** Promoted events for a place; [] when there are none or the lookup fails. */
export async function getPromotedEvents(
  placeSlug?: string,
): Promise<EventSummaryResponseDTO[]> {
  const query = await toPromotedQuery(placeSlug);
  return query ? fetchPromotedEvents(query) : [];
}

/** The promoted row without its own page container. */
export async function PromotedEventsRow({
  events: promotedEvents,
  placeSlug,
}: PromotedEventsRowProps): Promise<JSX.Element | null> {
  if (promotedEvents.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });
  const key = placeSlug ?? "catalunya";

  return (
    <section className="py-section-y border-b">
      <SectionHeading title={t("title")} titleClassName="heading-2 text-foreground" />
      <PromotedEventsTracker
        context="promoted_carousel"
        placeSlug={key}
        eventCount={promotedEvents.length}
      >
        <EventsAroundServer
          events={promotedEvents}
          usePriority={false}
          title={t("title")}
          jsonLdId={`promoted-events-${key}`}
        />
      </PromotedEventsTracker>
    </section>
  );
}

export default async function PromotedEventsSection({
  placeSlug,
}: PromotedEventsSectionProps): Promise<JSX.Element | null> {
  const events = await getPromotedEvents(placeSlug);
  if (events.length === 0) return null;
  return (
    <div className="container content-auto-section">
      <PromotedEventsRow events={events} placeSlug={placeSlug} />
    </div>
  );
}
