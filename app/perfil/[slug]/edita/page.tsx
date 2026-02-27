import { notFound } from "next/navigation";
import { fetchProfileBySlug } from "@lib/api/profiles";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import ProfileEditForm from "@components/ui/profile/ProfileEditForm";
import RequireAuth from "@components/ui/auth/RequireAuth";

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

  if (!profile) return { title: "Not Found" };

  return buildPageMeta({
    title: t("editPageTitle", { name: profile.name }),
    description: t("editPageDescription", { name: profile.name }),
    canonical: toLocalizedUrl(`/perfil/${slug}/edita`, locale),
    locale,
    robotsOverride: "noindex, nofollow",
  });
}

export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fetchProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div className="w-full max-w-lg">
        <RequireAuth>
          <ProfileEditForm profile={profile} />
        </RequireAuth>
      </div>
    </div>
  );
}
