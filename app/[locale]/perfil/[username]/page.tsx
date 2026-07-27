import { Suspense, use } from "react";
import { notFound } from "next/navigation";
import { getUserByUsernameCached } from "@lib/api/profiles";
import { buildPageMeta } from "@components/partials/seo-meta";
import ProfilePageShell from "@components/partials/ProfilePageShell";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { siteUrl } from "@config/index";

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

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);

  return (
    <Suspense fallback={<h1 className="sr-only">{username}</h1>}>
      <ProfilePageGate username={username} />
    </Suspense>
  );
}

async function ProfilePageGate({ username }: { username: string }) {
  const profile = await getUserByUsernameCached(username);

  if (!profile) {
    notFound();
  }

  return <ProfilePageShell profile={profile} />;
}
