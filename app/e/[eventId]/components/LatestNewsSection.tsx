import { getTranslations } from "next-intl/server";
import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import { formatPlacePreposition } from "@utils/helpers";
import type { LatestNewsSectionProps } from "types/props";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";

export default async function LatestNewsSection({
  placeSlug,
  placeLabel,
  placeType,
  newsHref,
}: LatestNewsSectionProps) {
  const t = await getTranslations("Components.LatestNewsSection");
  const locale = await getLocaleSafely();
  const newsResponse = await fetchNews({ page: 0, size: 3, place: placeSlug });
  const latestNews = newsResponse.content || [];

  if (latestNews.length === 0) {
    return null;
  }

  const placeSuffix =
    placeLabel && placeSlug !== "catalunya"
      ? formatPlacePreposition(placeLabel, placeType, locale, false)
      : "";
  const title = placeSuffix
    ? t("titleWithPlace", { place: placeSuffix })
    : t("title");

  return (
    <div className="w-full bg-background pb-8">
      <section className="container w-full flex flex-col gap-element-gap">
        <div className="w-full flex items-center justify-between">
          <h2 className="heading-2">{title}</h2>
          <PressableAnchor
            href={newsHref}
            prefetch={false}
            className="body-small text-primary underline hover:no-underline"
            variant="inline"
          >
            {t("viewAll")}
          </PressableAnchor>
        </div>
        <div className="flex flex-col gap-element-gap">
          {latestNews.map((newsItem, index) => (
            <NewsCard
              key={newsItem.id}
              event={newsItem}
              placeSlug={placeSlug}
              placeLabel={placeLabel}
              variant={index === 0 ? "hero" : "default"}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
