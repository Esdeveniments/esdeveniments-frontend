import VerifyEmailClient from "@components/ui/auth/VerifyEmailClient";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";

export async function generateMetadata() {
  const [locale, t] = await Promise.all([
    getLocaleSafely(),
    getTranslations("Auth.meta"),
  ]);

  return buildPageMeta({
    title: t("verifyEmailTitle"),
    description: t("verifyEmailDescription"),
    canonical: toLocalizedUrl("/verificar-email", locale),
    locale,
    robotsOverride: "noindex, nofollow",
  });
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div className="w-full max-w-md">
        <VerifyEmailClient token={token} />
      </div>
    </div>
  );
}
