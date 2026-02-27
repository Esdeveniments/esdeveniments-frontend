import { notFound } from "next/navigation";
import { fetchProfileBySlug } from "@lib/api/profiles";
import { fetchEvents, insertAds } from "@lib/api/events";
import { buildPageMeta } from "@components/partials/seo-meta";
import ProfilePageShell from "@components/partials/ProfilePageShell";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { siteUrl } from "@config/index";
import type { PageData } from "types/common";
import type { FetchEventsParams } from "types/event";

export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile, locale, t] = await Promise.all([
    fetchProfileBySlug(slug),
    getLocaleSafely(),
    getTranslations("Components.Profile"),
  ]);

  if (!profile) {
    return { title: "Not Found" };
  }

  const title = t("title", { name: profile.name });
  const description = t("metaDescription", { name: profile.name });
  const canonical = toLocalizedUrl(`/perfil/${slug}`, locale);

  return buildPageMeta({
    title,
    description,
    canonical,
    image: profile.avatarUrl || `${siteUrl}/static/images/logo-seo-meta.webp`,
    locale,
    openGraphType: "profile",
  });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile, locale, t] = await Promise.all([
    fetchProfileBySlug(slug),
    getLocaleSafely(),
    getTranslations("Components.Profile"),
  ]);

  if (!profile) {
    notFound();
  }

  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
    profileSlug: slug,
  };

  const eventsResponse = await fetchEvents(fetchParams);
  const events = eventsResponse.content;
  const noEventsFound = events.length === 0;
  const serverHasMore = !eventsResponse.last;
  const eventsWithAds = insertAds(events);

  const pageData: PageData = {
    title: t("title", { name: profile.name }),
    subTitle: t("metaDescription", { name: profile.name }),
    metaTitle: t("title", { name: profile.name }),
    metaDescription: t("metaDescription", { name: profile.name }),
    canonical: toLocalizedUrl(`/perfil/${slug}`, locale),
    notFoundTitle: t("noEvents"),
    notFoundDescription: t("noEventsDescription"),
  };

  return (
    <ProfilePageShell
      profile={profile}
      initialEvents={eventsWithAds}
      noEventsFound={noEventsFound}
      serverHasMore={serverHasMore}
      pageData={pageData}
    />
  );
}
