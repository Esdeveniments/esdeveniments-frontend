import { Suspense } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import JsonLdServer from "./JsonLdServer";
import ProfileHeader from "@components/ui/profile/ProfileHeader";
import { EventsListSkeleton } from "@components/ui/common/skeletons";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import type { ProfileDetailResponseDTO } from "types/api/profile";
import type { ListEvent } from "types/api/event";
import type { BreadcrumbItem, PageData } from "types/common";

interface ProfilePageShellProps {
  profile: ProfileDetailResponseDTO;
  initialEvents: ListEvent[];
  noEventsFound: boolean;
  serverHasMore: boolean;
  pageData: PageData;
}

export default async function ProfilePageShell({
  profile,
  initialEvents,
  noEventsFound,
  serverHasMore,
  pageData,
}: ProfilePageShellProps) {
  const tBreadcrumbs = await getTranslations("Components.Breadcrumbs");
  const tProfile = await getTranslations("Components.Profile");
  const locale = await getLocaleSafely();

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tBreadcrumbs("home"), url: toLocalizedUrl("/", locale) },
    { name: tProfile("breadcrumbProfiles"), url: toLocalizedUrl("/perfil", locale) },
    { name: profile.name, url: toLocalizedUrl(`/perfil/${profile.slug}`, locale) },
  ];

  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbItems);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: profile.name,
    url: toLocalizedUrl(`/perfil/${profile.slug}`, locale),
    ...(profile.avatarUrl && { logo: profile.avatarUrl }),
    ...(profile.bio && { description: profile.bio }),
    ...(profile.website && { sameAs: [profile.website] }),
  };

  return (
    <>
      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}
      <JsonLdServer
        id={`organization-${profile.slug}`}
        data={organizationSchema}
      />

      <div className="container flex-col justify-center items-center pt-[6rem]">
        <ProfileHeader profile={profile} />

        <Suspense fallback={<EventsListSkeleton />}>
          <HybridEventsList
            initialEvents={initialEvents}
            pageData={pageData}
            noEventsFound={noEventsFound}
            place={profile.city?.toLowerCase() || "catalunya"}
            profileSlug={profile.slug}
            serverHasMore={serverHasMore}
          />
        </Suspense>
      </div>
    </>
  );
}
