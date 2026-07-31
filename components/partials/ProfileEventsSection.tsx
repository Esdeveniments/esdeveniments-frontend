import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { fetchUserEvents } from "@lib/api/profiles";
import { getTranslations } from "next-intl/server";
import type { ProfileEventsSectionProps } from "types/props";

// First page of the profile's event listing, scoped to upcoming or past by
// the backend. Client pagination ("load more") via /api/users/[username]/events
// is a follow-up; v1 renders the first page.
const PROFILE_EVENTS_PAGE_SIZE = 20;

export default async function ProfileEventsSection({
  username,
  status,
}: ProfileEventsSectionProps) {
  const [t, eventsResponse] = await Promise.all([
    getTranslations("Components.Profile"),
    fetchUserEvents(username, 0, PROFILE_EVENTS_PAGE_SIZE, status),
  ]);

  const sectionLabel = t(status === "past" ? "tabPast" : "tabUpcoming");

  return (
    <section aria-label={sectionLabel} data-testid="profile-events">
      {eventsResponse.content.length === 0 ? (
        <NoEventsFound
          title={t(status === "past" ? "noPastEvents" : "noUpcomingEvents")}
        />
      ) : (
        <List events={eventsResponse.content}>
          {(event, index) => (
            <CardServer event={event} isPriority={index === 0} />
          )}
        </List>
      )}
    </section>
  );
}
