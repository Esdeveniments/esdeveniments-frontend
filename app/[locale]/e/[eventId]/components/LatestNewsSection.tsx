import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { fetchNews } from "@lib/api/news";
import NewsCardGrid from "@components/noticies/NewsCardGrid";
import { formatPlacePreposition } from "@utils/helpers";
import type { LatestNewsSectionProps } from "types/props";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";
import { NEWS_FRESHNESS_DAYS, SEE_ALL_LINK_CLASS } from "@utils/constants";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

export default async function LatestNewsSection({
  placeSlug,
  placeLabel,
  placeType,
  newsHref,
  sourceEventId,
  sourceEventSlug,
}: LatestNewsSectionProps) {
  // Opt out of cacheComponents caching: this component renders a variable-shape
  // tree (early `return null`, freshness-dependent title) driven by `new Date()`
  // and async data. Without connection(), the cached prerender tree can mismatch
  // the resume tree → "Expected Fragment but got script" PPR resume errors.
  await connection();

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.LatestNewsSection" });
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
      <section
        className="container w-full stack"
        data-analytics-container="true"
        data-analytics-context="event_news"
        data-analytics-source-event-id={sourceEventId ?? ""}
        data-analytics-source-event-slug={sourceEventSlug ?? ""}
      >
        <div className="flex-between gap-element-gap">
          <h2 className="heading-2">{title}</h2>
          <PressableAnchor
            href={newsHref}
            prefetch={false}
            className={SEE_ALL_LINK_CLASS}
            variant="inline"
          >
            {t("viewAll")} <ChevronRightIcon className="w-5 h-5" />
          </PressableAnchor>
        </div>
        <NewsCardGrid items={latestNews} place={placeSlug} placeLabel={placeLabel} />
      </section>
    </div>
  );
}
