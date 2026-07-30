import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getUserByUsernameCached } from "@lib/api/profiles";
import { buildPageMeta } from "@components/partials/seo-meta";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import ProfileEventsSection from "@components/partials/ProfileEventsSection";
import Tabs from "@components/ui/common/tabs";
import EventCardSkeleton from "@components/ui/common/skeletons/EventCardSkeleton";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { siteUrl } from "@config/index";
import type { BreadcrumbItem } from "types/common";
import type { TabItem } from "types/props";

// No generateStaticParams — usernames are user-generated with infinite
// cardinality. Pages render on first request and are cached automatically.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, locale, t] = await Promise.all([
    getUserByUsernameCached(username),
    getLocaleSafely(),
    getTranslations("Components.Profile"),
  ]);

  if (!profile) {
    return { title: "Not Found" };
  }

  // 2026-07-25 backend moved to `displayName`; keep `name` as a fallback
  // during the cut-over window so SEO titles don't render as "undefined".
  const displayName =
    profile.displayName?.trim() || profile.name?.trim() || profile.username;
  const title = t("title", { name: displayName });
  const description = t("metaDescription", { name: displayName });
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
}: {
  params: Promise<{ username: string }>;
}) {
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

  // 2026-07-25 backend migration: profile.displayName is canonical; profile.name
  // is the legacy field; profile.username is the safety net. Breadcrumb
  // schemas and the Person schema require string `name`, so coalesce.
  const profileDisplayName =
    profile.displayName?.trim() ||
    profile.name?.trim() ||
    profile.username?.trim() ||
    "";

  // No middle "Profiles" crumb: /perfil has no index route to link to.
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tBreadcrumbs("home"), url: toLocalizedUrl("/", locale) },
    { name: profileDisplayName, url: profileUrl },
  ];

  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbItems);

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profileDisplayName,
    url: profileUrl,
    identifier: profile.username,
  };

  const tabItems: TabItem[] = [
    {
      id: "upcoming",
      href: `/perfil/${encodeURIComponent(profile.username)}`,
      label: tProfile("tabUpcoming"),
      count: profile.upcomingEventCount,
    },
    {
      id: "past",
      href: `/perfil/${encodeURIComponent(profile.username)}/passats`,
      label: tProfile("tabPast"),
      count: profile.pastEventCount,
    },
  ];

  return (
    <>
      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}
      <JsonLdServer id={`person-${profile.username}`} data={personSchema} />

      <Tabs
        items={tabItems}
        active="upcoming"
        ariaLabel={tProfile("title", { name: profileDisplayName })}
      />
      <div className="w-full mt-section-y">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <ProfileEventsSection username={profile.username} status="upcoming" />
        </Suspense>
      </div>
    </>
  );
}
