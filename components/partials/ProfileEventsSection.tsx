import { fetchUserEvents } from "@lib/api/profiles";
import { fetchEventsCached } from "@lib/api/events";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Link } from "@i18n/routing";
import EventCardList from "@components/ui/card/EventCardList";
import EventsSection from "./EventsSection";
import ProfileEventsLoadMore from "./ProfileEventsLoadMore";
import type { ProfileEventsSectionProps } from "types/props";
import type { AppLocale } from "types/i18n";
import { formatPlacePreposition } from "@utils/string-helpers";

// First page of the profile's event listing, scoped to upcoming or past by
// the backend. Later pages load on the client via /api/users/[username]/events.
const PROFILE_EVENTS_PAGE_SIZE = 20;
// An empty Propers tab shows the organizer's latest events, links to Passats
// and suggests upcoming events in the town of the latest one, so the page
// isn't a dead end.
const RECENT_PAST_SIZE = 3;
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
      RECENT_PAST_SIZE,
      "past",
    );
    if (latestPast.content.length > 0) {
      const city = latestPast.content[0].city;
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
          <p className="body-normal text-muted-foreground">
            {t("noUpcomingEvents")}
          </p>
          <h2 className="heading-3 text-foreground-strong mt-section-y mb-element-gap">
            {t("recentEvents")}
          </h2>
          <EventCardList events={latestPast.content} headingLevel="h3" />
          {latestPast.totalElements > latestPast.content.length && (
            <div className="flex justify-center py-section-y">
              <Link
                href={`/perfil/${encodeURIComponent(username)}/passats`}
                className="btn-neutral"
                data-testid="profile-view-all-past"
              >
                {t("viewAllPastEvents", { count: latestPast.totalElements })}
              </Link>
            </div>
          )}
          {town && townEvents.length > 0 && (
            <>
              <h2 className="heading-3 text-foreground-strong mt-section-y mb-element-gap">
                {t("upcomingInTown", { placeIn: townIn })}
              </h2>
              <EventCardList events={townEvents} headingLevel="h3" />
              <div className="flex justify-center py-section-y">
                <Link
                  href={`/${town.slug}`}
                  className="btn-neutral"
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
    <>
      <EventsSection
        events={events}
        emptyTitle={t(status === "past" ? "noPastEvents" : "noUpcomingEvents")}
        sectionLabel={sectionLabel}
        testId="profile-events"
      />
      {events.length > 0 && !eventsResponse.last && (
        <ProfileEventsLoadMore
          username={username}
          status={status}
          pageSize={PROFILE_EVENTS_PAGE_SIZE}
          initialIds={events.map((event) => event.id)}
        />
      )}
    </>
  );
}
