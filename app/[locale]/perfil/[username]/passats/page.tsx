import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getUserByUsernameCached } from "@lib/api/profiles";
import { buildPageMeta } from "@components/partials/seo-meta";
import ProfileEventsSection from "@components/partials/ProfileEventsSection";
import { buildProfileTabItems } from "@components/partials/profile-tabs";
import Tabs from "@components/ui/common/tabs";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { siteUrl } from "@config/index";
import ProfilePageTracker from "../ProfilePageTracker";

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

  const tabItems = buildProfileTabItems(profile, tProfile);

  return (
    <>
      <Tabs
        items={tabItems}
        active="past"
        ariaLabel={tProfile("title", { name: displayName })}
      />
      <ProfilePageTracker
        username={profile.username}
        upcomingCount={profile.upcomingEventCount}
        pastCount={profile.pastEventCount}
        status="past"
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
