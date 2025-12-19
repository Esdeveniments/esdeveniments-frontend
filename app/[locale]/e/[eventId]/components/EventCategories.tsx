import Badge from "@components/ui/common/badge";
import { TagIcon } from "@heroicons/react/outline";
import type { EventCategoriesProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import { buildCanonicalUrl } from "@utils/url-filters";
import { getLocale, getTranslations } from "next-intl/server";
import { withLocalePath } from "@utils/i18n-seo";
import { getLocalizedCategoryLabelFromConfig } from "@utils/category-helpers";
import { ensureLocale } from "@utils/i18n-routing";

export default async function EventCategories({
  categories,
  place,
}: EventCategoriesProps) {
  if (!categories || categories.length === 0) return null;

  const locale = ensureLocale(await getLocale());
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
          Icon={TagIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={t("title")}
          titleClassName="heading-2"
        />
        <div className="flex flex-wrap gap-element-gap px-section-x text-foreground-strong">
          {categories.map((category) => (
            <Badge
              key={category.id}
              href={withLocalePath(
                buildCanonicalUrl({ place, category: category.slug }),
                locale
              )}
            >
              {getLocalizedCategoryLabelFromConfig(
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
