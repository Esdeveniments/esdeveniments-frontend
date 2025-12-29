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

export default async function NewsList({
  newsPromise,
  placeTypePromise,
  place,
  currentPage,
  pageSize,
  basePath,
}: NewsListProps) {
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

  const schemaBasePath = basePath || `/noticies/${place}`;

  const getItemPlace = (item: NewsSummaryResponseDTO) => {
    const slug = item.city?.slug || item.region?.slug || place;
    const label = item.city?.name || item.region?.name || placeType.label;
    return { slug, label };
  };

  const newsItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}${withLocale(schemaBasePath)}#news-itemlist`,
    name: t("itemListName", { place: placeType.label }),
    numberOfItems: list.length,
    itemListElement: list.map((item: NewsSummaryResponseDTO, index: number) => {
      const itemPlace = basePath
        ? getItemPlace(item)
        : { slug: place, label: placeType.label };

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
      {/* Note: Head links for prev/next were here but next/head is not supported in App Router server components in the same way. 
          We omit them here or they should be handled via metadata if blocking is acceptable, 
          but since we are streaming, we can't easily inject into head. */}

      <JsonLdServer id="news-place-itemlist" data={newsItemList} />

      <section className="flex flex-col gap-6 px-2 lg:px-0">
        {list.map((event: NewsSummaryResponseDTO, index: number) => {
          const itemPlace = basePath
            ? getItemPlace(event)
            : { slug: place, label: placeType.label };

          return (
            <NewsCard
              key={`${event.id}-${index}`}
              event={event}
              placeSlug={itemPlace.slug}
              placeLabel={itemPlace.label}
              variant="default"
            />
          );
        })}
      </section>
      <div className="w-full flex justify-between items-center mt-6 px-2 lg:px-0 text-sm">
        {currentPage > 0 ? (
          <PressableAnchor
            href={{
              pathname: withLocale(basePath || `/noticies/${place}`),
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
              pathname: withLocale(basePath || `/noticies/${place}`),
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
