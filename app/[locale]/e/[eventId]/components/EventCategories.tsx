import Badge from "@components/ui/common/badge";
import type { EventCategoriesProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import { buildCanonicalUrl } from "@utils/url-filters";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { getCategoryLabel } from "@utils/category-helpers";

export default async function EventCategories({
  categories,
  place,
}: EventCategoriesProps) {
  if (!categories || categories.length === 0) return null;

  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({
    locale,
    namespace: "Components.EventCategories",
  });
  const tCategories = await getTranslations({
    locale,
    namespace: "Config.Categories",
  });

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          title={t("title")}
          titleClassName="heading-2"
        />
        <div className="flex flex-wrap gap-element-gap text-foreground-strong">
          {categories.map((category) => (
            <Badge
              key={category.id}
              href={buildCanonicalUrl({ place, category: category.slug })}
            >
              {getCategoryLabel(
                category.slug,
                category.name,
                tCategories
              )}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
