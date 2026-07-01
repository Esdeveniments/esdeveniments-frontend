import JsonLdServer from "./JsonLdServer";
import ProfileHeader from "@components/ui/profile/ProfileHeader";
import ProfileClaimCta from "@components/ui/profile/ProfileClaimCta";
import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import { fetchUserEvents } from "@lib/api/profiles";
import { filterActiveEvents } from "@utils/event-helpers";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import type { BreadcrumbItem } from "types/common";
import type { ProfilePageShellProps } from "types/props";

// First page of the profile's event listing. Client pagination ("load more")
// via /api/users/[username]/events is a follow-up; v1 renders the first page.
const PROFILE_EVENTS_PAGE_SIZE = 20;

export default async function ProfilePageShell({
  profile,
}: ProfilePageShellProps) {
  const [tBreadcrumbs, tProfile, locale, eventsResponse] = await Promise.all([
    getTranslations("Components.Breadcrumbs"),
    getTranslations("Components.Profile"),
    getLocaleSafely(),
    fetchUserEvents(profile.username, 0, PROFILE_EVENTS_PAGE_SIZE),
  ]);
  const activeEvents = filterActiveEvents(eventsResponse.content);

  const profileUrl = toLocalizedUrl(`/perfil/${profile.username}`, locale);

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tBreadcrumbs("home"), url: toLocalizedUrl("/", locale) },
    {
      name: tProfile("breadcrumbProfiles"),
      url: toLocalizedUrl("/perfil", locale),
    },
    { name: profile.name, url: profileUrl },
  ];

  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbItems);

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: profileUrl,
    identifier: profile.username,
  };

  return (
    <>
      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}
      <JsonLdServer
        id={`person-${profile.username}`}
        data={personSchema}
      />

      <div className="container flex flex-col justify-center items-center pt-[6rem]">
        <ProfileHeader profile={profile} />
        <ProfileClaimCta username={profile.username} />

        <section
          className="w-full mt-section-y"
          aria-labelledby="profile-events-heading"
          data-testid="profile-events"
        >
          <h2
            id="profile-events-heading"
            className="heading-2 mb-element-gap"
          >
            {tProfile("events")}
          </h2>
          {activeEvents.length === 0 ? (
            <NoEventsFound title={tProfile("noEvents")} />
          ) : (
            <List events={activeEvents}>
              {(event, index) => (
                <CardServer
                  key={`${event.id}-${index}`}
                  event={event}
                  isPriority={index === 0}
                />
              )}
            </List>
          )}
        </section>
      </div>
    </>
  );
}
