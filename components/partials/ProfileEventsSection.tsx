import { fetchUserEvents } from "@lib/api/profiles";
import { getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";
import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import EventsSection from "./EventsSection";
import type { ProfileEventsSectionProps } from "types/props";

// First page of the profile's event listing, scoped to upcoming or past by
// the backend. Client pagination ("load more") via /api/users/[username]/events
// is a follow-up; v1 renders the first page.
const PROFILE_EVENTS_PAGE_SIZE = 20;
// Shown on an empty Propers tab so the page isn't a dead end.
const LATEST_PAST_EVENTS_SIZE = 6;

export default async function ProfileEventsSection({
  username,
  status,
  upcomingCount,
}: ProfileEventsSectionProps) {
  const skipFetch = status === "upcoming" && upcomingCount === 0;
  const [t, eventsResponse] = await Promise.all([
    getTranslations("Components.Profile"),
    skipFetch
      ? null
      : fetchUserEvents(username, 0, PROFILE_EVENTS_PAGE_SIZE, status),
  ]);
  const events = eventsResponse?.content ?? [];
  const sectionLabel = t(status === "past" ? "tabPast" : "tabUpcoming");

  if (status === "upcoming" && events.length === 0) {
    const latestPast = await fetchUserEvents(
      username,
      0,
      LATEST_PAST_EVENTS_SIZE,
      "past",
    );
    if (latestPast.content.length > 0) {
      return (
        <section aria-label={sectionLabel} data-testid="profile-events">
          <p className="body-normal text-muted-foreground mb-element-gap">
            {t("noUpcomingEvents")}
          </p>
          <h2 className="heading-3 text-foreground-strong mb-element-gap">
            {t("latestPastEvents")}
          </h2>
          <List events={latestPast.content}>
            {(event, index) => (
              <CardServer
                key={`${event.id}-${index}`}
                event={event}
                isPriority={index === 0}
              />
            )}
          </List>
          {latestPast.totalElements > latestPast.content.length && (
            <div className="flex justify-center py-section-y">
              <Link
                href={`/perfil/${encodeURIComponent(username)}/passats`}
                className="btn-outline"
                data-testid="profile-view-all-past"
              >
                {t("viewAllPastEvents", { count: latestPast.totalElements })}
              </Link>
            </div>
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
