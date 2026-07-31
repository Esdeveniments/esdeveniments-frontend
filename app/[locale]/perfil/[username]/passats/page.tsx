import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getUserByUsernameCached } from "@lib/api/profiles";
import { buildPageMeta } from "@components/partials/seo-meta";
import ProfileEventsSection from "@components/partials/ProfileEventsSection";
import Tabs from "@components/ui/common/tabs";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { siteUrl } from "@config/index";
import type { TabItem } from "types/props";

// No generateStaticParams — mirrors the parent /perfil/[username] page.

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

  const displayName =
    profile.displayName?.trim() || profile.name?.trim() || profile.username;
  const title = t("pastTitle", { name: displayName });
  const description = t("pastMetaDescription", { name: displayName });
  const canonical = toLocalizedUrl(`/perfil/${username}/passats`, locale);

  return buildPageMeta({
    title,
    description,
    canonical,
    image: `${siteUrl}/static/images/logo-seo-meta.webp`,
    locale,
    openGraphType: "profile",
    // Past events are proof-of-activity, not a page worth ranking on its own —
    // the canonical /perfil/[username] carries the SEO/JSON-LD weight.
    robotsOverride: "noindex, follow",
  });
}

export default async function ProfilePastEventsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [profile, tProfile] = await Promise.all([
    getUserByUsernameCached(username),
    getTranslations("Components.Profile"),
  ]);

  if (!profile) {
    notFound();
  }

  const displayName =
    profile.displayName?.trim() ||
    profile.name?.trim() ||
    profile.username?.trim() ||
    "";

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
      <Tabs
        items={tabItems}
        active="past"
        ariaLabel={tProfile("title", { name: displayName })}
      />
      <div className="w-full mt-section-y">
        <Suspense
          fallback={<EventsGridSkeleton count={3} />}
        >
          <ProfileEventsSection username={profile.username} status="past" />
        </Suspense>
      </div>
    </>
  );
}
