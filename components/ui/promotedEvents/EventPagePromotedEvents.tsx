import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import SectionHeading from "@components/ui/common/SectionHeading";
import PromotedEventsTracker from "@components/ui/promotedEvents/PromotedEventsTracker";
import { fetchPromotedEvents } from "@lib/api/promotions";
import { getLocaleSafely } from "@utils/i18n-seo";
import { mergePromotedEvents } from "@utils/promoted-events";
import type { EventPagePromotedEventsProps } from "types/props";

const MAX_PROMOTED_ON_EVENT_PAGE = 8;

/**
 * Promoted events near the event being viewed: its town's first, then the
 * comarca's (REGION placement: comarca, province and Catalonia promotions).
 * Request-time, so it streams in outside the cached event body.
 */
export default async function EventPagePromotedEvents({
  eventId,
  cityId,
  citySlug,
  regionId,
}: EventPagePromotedEventsProps): Promise<JSX.Element | null> {
  const [inTown, inRegion] = await Promise.all([
    cityId ? fetchPromotedEvents({ placement: "CITY", cityId }) : [],
    regionId ? fetchPromotedEvents({ placement: "REGION", regionId }) : [],
  ]);
  const events = mergePromotedEvents(
    [inTown, inRegion],
    eventId,
    MAX_PROMOTED_ON_EVENT_PAGE,
  );
  if (events.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });

  return (
    <div className="w-full min-w-0">
      <div className="w-full mb-element-gap">
        <SectionHeading title={t("title")} titleClassName="heading-2" />
      </div>
      <PromotedEventsTracker
        context="promoted_event_page"
        placeSlug={citySlug}
        eventCount={events.length}
      >
        <div className="w-full overflow-hidden min-w-0">
          <EventsAroundServer
            events={events}
            layout="compact"
            showJsonLd={false}
            title={t("title")}
          />
        </div>
      </PromotedEventsTracker>
    </div>
  );
}
