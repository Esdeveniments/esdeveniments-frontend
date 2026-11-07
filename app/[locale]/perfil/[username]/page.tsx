import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getUserByUsernameCached } from "@lib/api/profiles";
import { buildPageMeta } from "@components/partials/seo-meta";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import ProfileEventsSection from "@components/partials/ProfileEventsSection";
import { buildProfileTabItems } from "@components/partials/profile-tabs";
import Tabs from "@components/ui/common/tabs";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { siteUrl } from "@config/index";
import { getProfileDisplayName } from "@utils/profile-name";
import { isVerifiedOrganization } from "@utils/user-helpers";
import { formatNameOf } from "@utils/string-helpers";
import type { BreadcrumbItem } from "types/common";
import ProfilePageTracker from "./ProfilePageTracker";

// No generateStaticParams — usernames are user-generated with infinite
// cardinality. Pages render on first request and are cached automatically.

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/perfil/[username]">) {
  const { username } = await params;
  const [profile, locale, t] = await Promise.all([
    getUserByUsernameCached(username),
    getLocaleSafely(),
    getTranslations("Components.Profile"),
  ]);

  if (!profile) {
    return { title: "Not Found" };
  }

  const displayName = getProfileDisplayName(profile);
  const nameOf = formatNameOf(displayName, locale);
  const title = t("title", { name: displayName });
  const description = t("metaDescription", { nameOf });
  const canonical = toLocalizedUrl(`/perfil/${username}`, locale);

  return buildPageMeta({
    title,
    description,
    canonical,
    image: `${siteUrl}/static/images/logo-seo-meta.webp`,
    locale,
    openGraphType: "profile",
  });
}

export default async function ProfilePage({
  params,
}: PageProps<"/[locale]/perfil/[username]">) {
  const { username } = await params;

  const [profile, tBreadcrumbs, tProfile, locale] = await Promise.all([
    getUserByUsernameCached(username),
    getTranslations("Components.Breadcrumbs"),
    getTranslations("Components.Profile"),
    getLocaleSafely(),
  ]);

  if (!profile) {
    notFound();
  }

  const profileUrl = toLocalizedUrl(`/perfil/${profile.username}`, locale);

  const profileDisplayName = getProfileDisplayName(profile);

  // No middle "Profiles" crumb: /perfil has no index route to link to.
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tBreadcrumbs("home"), url: toLocalizedUrl("/", locale) },
    { name: profileDisplayName, url: profileUrl },
  ];

  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbItems);

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": isVerifiedOrganization(profile) ? "Organization" : "Person",
    name: profileDisplayName,
    url: profileUrl,
    identifier: profile.username,
  };

  const tabItems = buildProfileTabItems(profile, tProfile);

  return (
    <>
      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}
      <JsonLdServer id={`person-${profile.username}`} data={profileSchema} />

      <Tabs
        items={tabItems}
        active="upcoming"
        ariaLabel={tProfile("title", { name: profileDisplayName })}
      />
      <ProfilePageTracker
        username={profile.username}
        upcomingCount={profile.upcomingEventCount}
        pastCount={profile.pastEventCount}
        status="upcoming"
      />
      <div className="w-full mt-section-y">
        <Suspense
          fallback={<EventsGridSkeleton count={3} />}
        >
          <ProfileEventsSection username={profile.username} status="upcoming" />
        </Suspense>
      </div>
    </>
  );
}
