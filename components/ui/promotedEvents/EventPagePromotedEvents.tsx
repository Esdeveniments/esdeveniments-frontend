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
}: EventPagePromotedEventsProps): Promise<JSX.Element | null> {
  if (events.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });

  return (
    <PromotedEventsTracker
      context="promoted_event_page"
      placeSlug={citySlug}
      eventCount={events.length}
    >
      <EventsAroundSection events={events} title={t("title")} bleed />
    </PromotedEventsTracker>
  );
}
