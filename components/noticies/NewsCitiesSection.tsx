import { getTranslations } from "next-intl/server";
import Badge from "@components/ui/common/badge";
import type { NewsCitiesSectionProps } from "types/props";
import { getLocaleSafely } from "@utils/i18n-seo";
import { comparePlaceNames } from "@utils/string-helpers";

// Same active look as the filter chips (FilterButton).
const CHIP_CLASS =
  "inline-flex shrink-0 whitespace-nowrap aria-[current=page]:border-primary aria-[current=page]:bg-primary/5 aria-[current=page]:text-foreground-strong";

export default async function NewsCitiesSection({
  cities,
  currentPlace,
}: NewsCitiesSectionProps) {
  if (cities.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.NewsCities" });
  const sorted = [...cities].sort((a, b) => comparePlaceNames(a.name, b.name, locale));

  return (
    // One scrollable row on mobile, like the listing filter bar; the padding
    // keeps the chips' focus ring from being clipped.
    <nav
      aria-label={t("title")}
      className="flex gap-2 overflow-x-auto no-scrollbar -m-1 p-1 md:flex-wrap md:overflow-visible"
    >
      <Badge
        href="/noticies"
        className={CHIP_CLASS}
        ariaCurrent={currentPlace ? undefined : "page"}
      >
        {t("all")}
      </Badge>
      {sorted.map((city) => (
        <Badge
          key={city.slug}
          href={`/noticies/${city.slug}`}
          className={CHIP_CLASS}
          ariaCurrent={city.slug === currentPlace ? "page" : undefined}
        >
          {city.name}
        </Badge>
      ))}
    </nav>
  );
}
