import { fetchUserEvents } from "@lib/api/profiles";
import { fetchEventsCached } from "@lib/api/events";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Link } from "@i18n/routing";
import EventCardList from "@components/ui/card/EventCardList";
import EventsSection from "./EventsSection";
import type { ProfileEventsSectionProps } from "types/props";
import type { AppLocale } from "types/i18n";
import { formatPlacePreposition } from "@utils/string-helpers";

// First page of the profile's event listing, scoped to upcoming or past by
// the backend. Client pagination ("load more") via /api/users/[username]/events
// is a follow-up; v1 renders the first page.
const PROFILE_EVENTS_PAGE_SIZE = 20;
// An empty Propers tab links to Passats and suggests upcoming events in the
// town of the organizer's latest event, so the page isn't a dead end.
const LATEST_PAST_PROBE_SIZE = 1;
const TOWN_EVENTS_SIZE = 6;

export default async function ProfileEventsSection({
  username,
  status,
}: ProfileEventsSectionProps) {
  const locale = (await rootLocale()) as AppLocale;
  const [t, eventsResponse] = await Promise.all([
    getTranslations({ locale, namespace: "Components.Profile" }),
    fetchUserEvents(username, 0, PROFILE_EVENTS_PAGE_SIZE, status),
  ]);
  const events = eventsResponse.content;
  const sectionLabel = t(status === "past" ? "tabPast" : "tabUpcoming");

  if (status === "upcoming" && events.length === 0) {
    const latestPast = await fetchUserEvents(
      username,
      0,
      LATEST_PAST_PROBE_SIZE,
      "past",
    );
    if (latestPast.totalElements > 0) {
      const city = latestPast.content[0]?.city;
      const town = city?.enabled ? city : undefined;
      const townEvents = town
        ? (
            await fetchEventsCached({
              place: town.slug,
              page: 0,
              size: TOWN_EVENTS_SIZE,
            })
          ).content
        : [];
      const townIn = town
        ? formatPlacePreposition(town.name, "town", locale, false)
        : "";
      return (
        <section aria-label={sectionLabel} data-testid="profile-events">
          <div className="flex flex-col items-center gap-element-gap py-section-y text-center">
            <p className="body-normal text-muted-foreground">
              {t("noUpcomingEvents")}
            </p>
            <Link
              href={`/perfil/${encodeURIComponent(username)}/passats`}
              className="btn-outline"
              data-testid="profile-view-all-past"
            >
              {t("viewAllPastEvents", { count: latestPast.totalElements })}
            </Link>
          </div>
          {town && townEvents.length > 0 && (
            <>
              <h2 className="heading-3 text-foreground-strong mb-element-gap">
                {t("upcomingInTown", { placeIn: townIn })}
              </h2>
              <EventCardList events={townEvents} />
              <div className="flex justify-center py-section-y">
                <Link
                  href={`/${town.slug}`}
                  className="btn-outline"
                  data-testid="profile-view-town"
                >
                  {t("moreInTown", { placeIn: townIn })}
                </Link>
              </div>
            </>
          )}
        </section>
      );
    }
  }

  return (
    <EventsSection
      events={events}
      emptyTitle={t(status === "past" ? "noPastEvents" : "noUpcomingEvents")}
      sectionLabel={sectionLabel}
      testId="profile-events"
    />
  );
}
