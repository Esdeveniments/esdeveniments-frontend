import JsonLdServer from "./JsonLdServer";
import ProfileHeader from "@components/ui/profile/ProfileHeader";
import ProfileClaimCta from "@components/ui/profile/ProfileClaimCta";
import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import { getUserEventsExternal } from "@lib/api/users-external";
import { filterActiveEvents } from "@utils/event-helpers";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import type { BreadcrumbItem } from "types/common";
import type { ProfilePageShellProps } from "types/props";

// First-page size for the profile's event listing. Pagination ("load more")
// is deferred — v1 shows the most recent page, matching the favourites page.
// ponytail: add client pagination via /api/users/[username]/events when a
// profile with many events actually needs it.
const PROFILE_EVENTS_PAGE_SIZE = 20;

export default async function ProfilePageShell({
  profile,
}: ProfilePageShellProps) {
  const tBreadcrumbs = await getTranslations("Components.Breadcrumbs");
  const tProfile = await getTranslations("Components.Profile");
  const locale = await getLocaleSafely();

  const eventsResponse = await getUserEventsExternal(
    profile.username,
    0,
    PROFILE_EVENTS_PAGE_SIZE,
  );
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
          aria-label={tProfile("events")}
          data-testid="profile-events"
        >
          <h2 className="heading-2 mb-element-gap">{tProfile("events")}</h2>
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
