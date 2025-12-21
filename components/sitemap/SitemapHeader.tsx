
import { getTranslations } from "next-intl/server";
import type { SitemapHeaderProps } from "types/sitemap";

export default async function SitemapHeader({
  town,
  placePromise,
}: SitemapHeaderProps) {
  const t = await getTranslations("Components.SitemapHeader");
  const place = await placePromise;
  const label = place?.name || town;

  return (
    <header>
      <h1 className="heading-1 mb-4">{t("title", { label })}</h1>
      <p className="body-large text-foreground">
        {t("subtitle", { label })}
      </p>
    </header>
  );
}
