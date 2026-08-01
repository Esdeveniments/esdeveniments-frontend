import { fetchUserEvents } from "@lib/api/profiles";
import { getTranslations } from "next-intl/server";
import EventsSection from "./EventsSection";
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

  return (
    <EventsSection
      events={eventsResponse.content}
      emptyTitle={t(status === "past" ? "noPastEvents" : "noUpcomingEvents")}
      sectionLabel={t(status === "past" ? "tabPast" : "tabUpcoming")}
      testId="profile-events"
    />
  );
}
