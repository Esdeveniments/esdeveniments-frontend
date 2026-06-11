import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import { formatPlacePreposition } from "@utils/helpers";
import type { LatestNewsSectionProps } from "types/props";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";
import { NEWS_FRESHNESS_DAYS } from "@utils/constants";

export default async function LatestNewsSection({
  placeSlug,
  placeLabel,
  placeType,
  newsHref,
}: LatestNewsSectionProps) {
  // Opt out of cacheComponents caching: this component renders a variable-shape
  // tree (early `return null`, freshness-dependent title) driven by `new Date()`
  // and async data. Without connection(), the cached prerender tree can mismatch
  // the resume tree → "Expected Fragment but got script" PPR resume errors.
  await connection();

  const t = await getTranslations("Components.LatestNewsSection");
  const locale = await getLocaleSafely();
  const newsResponse = await fetchNews({ page: 0, size: 3, place: placeSlug });
  const latestNews = newsResponse.content || [];

  if (latestNews.length === 0) {
    return null;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEWS_FRESHNESS_DAYS);
  const isFresh = latestNews.some(
    (n) => new Date(n.endDate) >= cutoff,
  );

  const placeSuffix =
    placeLabel && placeSlug !== "catalunya"
      ? formatPlacePreposition(placeLabel, placeType, locale, false)
      : "";
  const title = placeSuffix
    ? t(isFresh ? "titleWithPlace" : "titleStaleWithPlace", {
      place: placeSuffix,
    })
    : t(isFresh ? "title" : "titleStale");

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
          {/* Hero card — full width */}
          <NewsCard
            key={latestNews[0].id}
            event={latestNews[0]}
            placeSlug={placeSlug}
            placeLabel={placeLabel}
            variant="hero"
          />
          {/* Remaining cards — 2-column grid on desktop */}
          {latestNews.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-element-gap">
              {latestNews.slice(1, 3).map((newsItem) => (
                <NewsCard
                  key={newsItem.id}
                  event={newsItem}
                  placeSlug={placeSlug}
                  placeLabel={placeLabel}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
