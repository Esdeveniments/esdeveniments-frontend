import { getTranslations } from "next-intl/server";
import NewsCard from "@components/ui/newsCard";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { NewsListProps } from "types/props";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { headers } from "next/headers";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";

export default async function NewsList({
  newsPromise,
  placeTypePromise,
  place,
  currentPage,
  pageSize,
}: NewsListProps) {
  const t = await getTranslations("Components.NewsList");
  const headersList = await headers();
  const locale = (resolveLocaleFromHeaders(headersList) ||
    DEFAULT_LOCALE) as AppLocale;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };
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

  const newsItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/noticies/${place}#news-itemlist`,
    name: t("itemListName", { place: placeType.label }),
    numberOfItems: list.length,
    itemListElement: list.map((item: NewsSummaryResponseDTO, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "NewsArticle",
        "@id": `${siteUrl}/noticies/${place}/${item.slug}`,
        url: `${siteUrl}/noticies/${place}/${item.slug}`,
        headline: item.title,
        ...(item.imageUrl ? { image: item.imageUrl } : {}),
      },
    })),
  };

  return (
    <>
      {/* Note: Head links for prev/next were here but next/head is not supported in App Router server components in the same way. 
          We omit them here or they should be handled via metadata if blocking is acceptable, 
          but since we are streaming, we can't easily inject into head. */}

      <JsonLdServer id="news-place-itemlist" data={newsItemList} />

      <section className="flex flex-col gap-6 px-2 lg:px-0">
        {list.map((event: NewsSummaryResponseDTO, index: number) => (
          <NewsCard
            key={`${event.id}-${index}`}
            event={event}
            placeSlug={place}
            placeLabel={placeType.label}
            variant={index === 0 ? "hero" : "default"}
          />
        ))}
      </section>
      <div className="w-full flex justify-between items-center mt-6 px-2 lg:px-0 text-sm">
        {currentPage > 0 ? (
          <PressableAnchor
            href={{
              pathname: withLocale(`/noticies/${place}`),
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
              pathname: withLocale(`/noticies/${place}`),
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
