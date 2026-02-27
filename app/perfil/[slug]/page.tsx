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

// --- ISR MIGRATION GUIDE ---
// Currently: fully dynamic/SSR (no generateStaticParams).
// Reason: getLocaleSafely() and getTranslations() call headers(), which is
// incompatible with static generation (causes DYNAMIC_SERVER_USAGE on Vercel).
//
// When the backend has a real /profiles endpoint:
// 1. Move locale/translations resolution OUT of the page component and into
//    a layout or middleware (so the page body doesn't call headers() directly).
// 2. Or use next-intl's static rendering mode (setRequestLocale) like
//    app/[place]/page.tsx does — but this requires the locale to be in the
//    route segment (e.g., /[locale]/perfil/[slug]).
// 3. Re-add generateStaticParams to pre-render top profiles at build time:
//    export async function generateStaticParams() {
//      const profiles = await fetchTopProfiles(); // new API endpoint
//      return profiles.map((p) => ({ slug: p.slug }));
//    }
//    export const dynamicParams = true; // allow on-demand ISR for others
// 4. Add "profiles" to ALLOWED_TAGS in app/api/revalidate/route.ts
//    for cache invalidation when profiles are updated.
//
// Cost analysis: /perfil/[slug] is flat (no searchParams), so ISR is safe.
// Expected: ~500 profiles × 3 locales = 1,500 DynamoDB entries max.

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
