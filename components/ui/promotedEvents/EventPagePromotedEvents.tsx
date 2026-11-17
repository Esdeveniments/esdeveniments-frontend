import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import PromotedEventsTracker from "@components/ui/promotedEvents/PromotedEventsTracker";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { EventPagePromotedEventsProps } from "types/props";

/** The event page's promoted row; `EventMoreEvents` picks the events. */
export default async function EventPagePromotedEvents({
  events,
  citySlug,
  fallbackPlaceSlug,
}: EventPagePromotedEventsProps): Promise<JSX.Element | null> {
  if (events.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });
  const placeSlug = citySlug || fallbackPlaceSlug;

  return (
    <PromotedEventsTracker
      context="promoted_event_page"
      placeSlug={placeSlug}
      eventCount={events.length}
    >
      <EventsAroundSection
        events={events}
        title={t("title")}
        bleed
        analyticsListName="promoted_event_page"
        analyticsContext={{ placeSlug }}
      />
    </PromotedEventsTracker>
  );
}
