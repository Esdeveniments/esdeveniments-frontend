import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { formatPlacePhrases } from "@utils/string-helpers";
import type { SitemapHeaderProps } from "types/sitemap";

export default async function SitemapHeader({
  placePromise,
}: SitemapHeaderProps) {
  const [locale, { type, label }] = await Promise.all([
    getLocaleSafely(),
    placePromise,
  ]);
  const t = await getTranslations({
    locale,
    namespace: "Components.SitemapHeader",
  });
  const { placeOf } = formatPlacePhrases(label, type, locale);

  return (
    <header>
      <h1 className="heading-1 mb-4">{t("title", { placeOf })}</h1>
      <p className="body-large text-foreground">
        {t("subtitle", { placeOf })}
      </p>
    </header>
  );
}
