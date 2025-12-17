import { getTranslations } from "next-intl/server";
import JsonLdServer from "@components/partials/JsonLdServer";
import NewsCard from "@components/ui/newsCard";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
// import { NEARBY_PLACES_BY_HUB } from "@utils/constants";
import { siteUrl } from "@config/index";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { NewsHubsGridProps } from "types/props";

export default async function NewsHubsGrid({ promise }: NewsHubsGridProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.NewsHubsGrid",
  });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocale(path)}`;
  const hubResults = await promise;
  const firstArticles = hubResults
    .map(({ hub, items }) =>
      items?.[0] ? { hub, item: items[0] as NewsSummaryResponseDTO } : null
    )
    .filter(
      (
        v
      ): v is {
        hub: { slug: string; name: string };
        item: NewsSummaryResponseDTO;
      } => v !== null
    );
  const itemListSchema =
    firstArticles.length > 0
      ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": absolute("/noticies#news-itemlist"),
        name: t("itemListTitle"),
        numberOfItems: firstArticles.length,
        itemListElement: firstArticles.map(({ hub, item }, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "NewsArticle",
            "@id": absolute(`/noticies/${hub.slug}/${item.slug}`),
            url: absolute(`/noticies/${hub.slug}/${item.slug}`),
            headline: item.title,
            ...(item.imageUrl ? { image: item.imageUrl } : {}),
          },
        })),
      }
      : null;

  return (
    <div className="flex flex-col gap-10 px-2 lg:px-0">
      {itemListSchema && (
        <JsonLdServer id="news-hubs-itemlist" data={itemListSchema} />
      )}
      {hubResults.map(({ hub, items }) => {
        const first = items?.[0];
        if (!first) return null;
        return (
          <section key={hub.slug} className="w-full">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="uppercase">
                {t("titleWithPlace", { place: hub.name })}
              </h2>
              <PressableAnchor
                href={withLocale(`/noticies/${hub.slug}`)}
                className="text-primary underline text-sm"
                prefetch={false}
                variant="inline"
              >
                {t("seeMore")}
              </PressableAnchor>
            </div>
            <div className="flex items-center gap-2 mb-2 text-xs text-foreground-strong/80">
              <PressableAnchor
                href={withLocale(`/${hub.slug}`)}
                prefetch={false}
                className="underline hover:text-primary"
                variant="inline"
              >
                {t("seeAgenda", { place: hub.name })}
              </PressableAnchor>
            </div>
            {/* {NEARBY_PLACES_BY_HUB[hub.slug] && (
              <nav className="mb-3 text-xs text-foreground-strong/70">
                <span className="mr-2">{t("nearbyLabel")}</span>
                {NEARBY_PLACES_BY_HUB[hub.slug].map((p, i) => (
                  <span key={p.slug} className="inline-flex items-center">
                    <PressableAnchor
                      href={withLocale(`/noticies/${p.slug}`)}
                      prefetch={false}
                      className="underline hover:text-primary"
                      variant="inline"
                    >
                      {p.name}
                    </PressableAnchor>
                    {i < NEARBY_PLACES_BY_HUB[hub.slug].length - 1 && (
                      <span className="mx-1">·</span>
                    )}
                  </span>
                ))}
              </nav>
            )} */}
            <NewsCard
              event={first}
              placeSlug={hub.slug}
              placeLabel={hub.name}
              variant="hero"
            />
          </section>
        );
      })}
    </div>
  );
}
