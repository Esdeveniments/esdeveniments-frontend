import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsCitiesSectionProps } from "types/props";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";

export default async function NewsCitiesSection({
  citiesPromise,
  showAll,
  showMoreHref,
  showLessHref,
}: NewsCitiesSectionProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.NewsCities" });
  const withLocale = (path: string) => withLocalePath(path, locale);

  const response = await citiesPromise;
  const cities = Array.isArray(response.content) ? response.content : [];

  if (cities.length === 0) return null;

  const sorted = [...cities].sort((a, b) =>
    a.name.localeCompare(b.name, locale)
  );

  const shouldShowMore = !showAll && response.totalElements > cities.length;

  return (
    <section className="w-full px-2 lg:px-0 mt-section-y-sm">
      <div className="flex-between mb-element-gap">
        <h2 className="heading-3 text-foreground-strong">{t("title")}</h2>
        {shouldShowMore ? (
          <PressableAnchor
            href={showMoreHref}
            prefetch={false}
            className="body-small text-primary underline"
            variant="inline"
          >
            {t("showMore")}
          </PressableAnchor>
        ) : showAll ? (
          <PressableAnchor
            href={showLessHref}
            prefetch={false}
            className="body-small text-primary underline"
            variant="inline"
          >
            {t("showLess")}
          </PressableAnchor>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {sorted.map((city) => (
          <PressableAnchor
            key={city.slug}
            href={withLocale(`/noticies/${city.slug}`)}
            prefetch={false}
            className="badge-default hover:bg-muted/80 transition-colors"
            variant="inline"
          >
            {city.name}
          </PressableAnchor>
        ))}
      </div>
    </section>
  );
}
