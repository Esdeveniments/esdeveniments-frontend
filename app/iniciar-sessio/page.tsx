import LoginForm from "@components/ui/auth/LoginForm";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";

export async function generateMetadata() {
  const [locale, t] = await Promise.all([
    getLocaleSafely(),
    getTranslations("Auth.meta"),
  ]);

  return buildPageMeta({
    title: t("loginTitle"),
    description: t("loginDescription"),
    canonical: toLocalizedUrl("/iniciar-sessio", locale),
    locale,
    robotsOverride: "noindex, nofollow",
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div className="w-full max-w-md">
        <LoginForm redirectTo={params.redirect} />
      </div>
    </div>
  );
}
