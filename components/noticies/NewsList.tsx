import { getTranslations } from "next-intl/server";
import NewsCard from "@components/ui/newsCard";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { NewsListProps } from "types/props";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  getLocaleSafely,
  withLocalePath,
} from "@utils/i18n-seo";
import { resolveNewsItemPlace } from "@utils/news-helpers";
import { connection } from "next/server";

export default async function NewsList({
  newsPromise,
  placeTypePromise,
  place,
  currentPage,
  pageSize,
  basePath,
}: NewsListProps) {
  // Opt out of cacheComponents caching — early return on empty list produces
  // a completely different tree (no JsonLdServer) vs the normal path.
  await connection();

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.NewsList" });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const [response, placeType] = await Promise.all([
    newsPromise,
    placeTypePromise,
  ]);
  const list = response.content;

  if (!list || list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-2 lg:px-0 text-center">
        <h2 className="heading-3" data-testid="not-found-title">
          {t("emptyTitle")}
        </h2>
        <p className="text-foreground-strong/70 max-w-2xl">
          {t("emptyBody", { place: placeType.label })}
        </p>
        <PressableAnchor
          href={withLocale("/noticies")}
          className="text-primary underline"
          variant="inline"
          prefetch={false}
        >
          {t("viewAll")}
        </PressableAnchor>
      </div>
    );
  }

  const resolvedBasePath = basePath || `/noticies/${place}`;

  const defaultPlace = { slug: place, label: placeType.label };
  const resolvePlace = (item: NewsSummaryResponseDTO) =>
    basePath
      ? resolveNewsItemPlace(item, place, placeType.label)
      : defaultPlace;

  const newsItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}${withLocale(resolvedBasePath)}#news-itemlist`,
    name: t("itemListName", { place: placeType.label }),
    numberOfItems: list.length,
    itemListElement: list.map((item: NewsSummaryResponseDTO, index: number) => {
      const itemPlace = resolvePlace(item);

      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "NewsArticle",
          "@id": `${siteUrl}${withLocale(`/noticies/${itemPlace.slug}/${item.slug}`)}`,
          url: `${siteUrl}${withLocale(`/noticies/${itemPlace.slug}/${item.slug}`)}`,
          headline: item.title,
          ...(item.imageUrl ? { image: item.imageUrl } : {}),
        },
      };
    }),
  };

  return (
    <>

      <JsonLdServer id="news-place-itemlist" data={newsItemList} />

      <section className="px-2 lg:px-0">
        {/* First card as hero (full width) */}
        {list.length > 0 && (() => {
          const heroPlace = resolvePlace(list[0]);
          return (
            <div className="mb-6">
              <NewsCard
                key={`${list[0].id}-hero`}
                event={list[0]}
                placeSlug={heroPlace.slug}
                placeLabel={heroPlace.label}
                variant="hero"
              />
            </div>
          );
        })()}

        {/* Remaining cards in responsive grid */}
        {list.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-element-gap">
            {list.slice(1).map((event: NewsSummaryResponseDTO, index: number) => {
              const itemPlace = resolvePlace(event);

              return (
                <NewsCard
                  key={`${event.id}-${index + 1}`}
                  event={event}
                  placeSlug={itemPlace.slug}
                  placeLabel={itemPlace.label}
                  variant="default"
                />
              );
            })}
          </div>
        )}
      </section>
      <div className="w-full flex justify-between items-center mt-6 px-2 lg:px-0 text-sm">
        {currentPage > 0 ? (
          <PressableAnchor
            href={{
              pathname: withLocale(resolvedBasePath),
              query: { page: String(currentPage - 1), size: String(pageSize) },
            }}
            prefetch={false}
            className="text-primary underline"
            variant="inline"
          >
            {t("prev")}
          </PressableAnchor>
        ) : (
          <span />
        )}
        {!response.last && (
          <PressableAnchor
            href={{
              pathname: withLocale(resolvedBasePath),
              query: { page: String(currentPage + 1), size: String(pageSize) },
            }}
            prefetch={false}
            className="text-primary underline"
            variant="inline"
          >
            {t("next")}
          </PressableAnchor>
        )}
      </div>
    </>
  );
}
