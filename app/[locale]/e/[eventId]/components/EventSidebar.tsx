import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import EventFacts from "./EventFacts";
import EventLocation from "./EventLocation";
import Weather from "components/ui/weather";
import AddToCalendar from "@components/ui/addToCalendar";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import EventOrganizerCard from "./EventOrganizerCard";
import { buildCalendarEventData } from "@utils/event-helpers";
import { getEventLinkUrl } from "@utils/event-url";
import { getEventVenue } from "@utils/location-helpers";
import { getEventVenueCoords } from "@utils/event-map";
import type { EventSidebarProps } from "types/props";
import type { AppLocale } from "types/i18n";

/**
 * Desktop sidebar: facts and the main action first, then where, weather and
 * who. Mobile shows the same blocks in the main column and the action bar.
 *
 * Not sticky: it is taller than most screens, so sticking would hide the
 * sponsor card until the end of the event content.
 */
export default async function EventSidebar({
  event,
  cityName,
  regionName,
  sponsorSlot,
}: EventSidebarProps) {
  const locale = (await rootLocale()) as AppLocale;
  const [t, tWeather] = await Promise.all([
    getTranslations({ locale, namespace: "Components.EventPage" }),
    getTranslations({ locale, namespace: "Components.Weather" }),
  ]);
  const eventUrl = getEventLinkUrl(event.url);

  return (
    <aside
      className="hidden lg:block w-[340px] xl:w-[380px] flex-shrink-0"
      aria-label={t("sidebarAriaLabel")}
    >
      <div className="flex flex-col gap-4">
        <div className="card-bordered">
          <div className="card-body flex flex-col gap-4">
            <EventFacts event={event} />

            <div className="stack">
              {eventUrl && (
                <a
                  href={eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full"
                  data-analytics-link-type="sidebar_visit_website"
                  data-analytics-context="event_sidebar"
                  data-analytics-event-id={event.id ? String(event.id) : ""}
                  data-analytics-event-slug={event.slug || ""}
                >
                  {t("moreInfo")}
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              <AddToCalendar
                {...buildCalendarEventData(event)}
                variant={eventUrl ? "outline" : "primary"}
                fullWidth
                source="sidebar"
              />
            </div>

            <hr className="border-border" />

            <EventLocation
              location={getEventVenue(event.location, event.title)}
              cityName={cityName}
              regionName={regionName}
              citySlug={event.city?.slug}
              regionSlug={event.region?.slug}
              profile={event.profile}
              venueCoords={getEventVenueCoords(event)}
              compact
            />

            {/* Only when there is a forecast (never for past events) */}
            {event.weather && (
              <>
                <hr className="border-border" />
                <section className="stack">
                  <h2 className="heading-4">{tWeather("title")}</h2>
                  <Weather weather={event.weather} />
                </section>
              </>
            )}

            {event.owner && (
              <>
                <hr className="border-border" />
                <EventOrganizerCard owner={event.owner} compact />
              </>
            )}
          </div>
        </div>

        {/* Sponsor card (outside main card for visual separation) */}
        {sponsorSlot}
      </div>
    </aside>
  );
}
