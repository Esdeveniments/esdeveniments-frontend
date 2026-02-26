import RegisterForm from "@components/ui/auth/RegisterForm";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";

export async function generateMetadata() {
  const [locale, t] = await Promise.all([
    getLocaleSafely(),
    getTranslations("Auth.meta"),
  ]);

  return buildPageMeta({
    title: t("registerTitle"),
    description: t("registerDescription"),
    canonical: toLocalizedUrl("/registre", locale),
    locale,
    robotsOverride: "noindex, nofollow",
  });
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; profile?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div className="w-full max-w-md">
        <RegisterForm
          redirectTo={params.redirect}
          suggestedName={params.profile}
        />
      </div>
    </div>
  );
}
