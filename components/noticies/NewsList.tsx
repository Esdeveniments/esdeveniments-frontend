import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { NewsListProps } from "types/props";
import JsonLdServer from "@components/partials/JsonLdServer";
import NewsCard from "@components/ui/newsCard";
import NewsCardGrid from "@components/noticies/NewsCardGrid";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import NewsCitiesSection from "@components/noticies/NewsCitiesSection";
import NewsPagination from "@components/noticies/NewsPagination";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { resolveNewsItemPlace } from "@utils/news-helpers";

export default async function NewsList({
  newsPromise,
  citiesPromise,
  place,
  placeLabel,
  page,
  basePath,
}: NewsListProps) {
  // Opt out of cacheComponents caching: an empty list renders a different
  // tree (no JSON-LD, empty state) than a full one.
  await connection();

  const [locale, response, citiesResponse] = await Promise.all([
    getLocaleSafely(),
    newsPromise,
    citiesPromise,
  ]);
  const t = await getTranslations({ locale, namespace: "Components.NewsList" });
  const cities = Array.isArray(citiesResponse.content) ? citiesResponse.content : [];
  const fallbackPlace = place ?? "catalunya";
  // Link each article to its own city/region so it doesn't 301 on click.
  const items = response.content.map((item) => ({
    ...item,
    place: resolveNewsItemPlace(item, fallbackPlace, placeLabel),
  }));
  const [featured, ...rest] = items;

  const chips = <NewsCitiesSection cities={cities} currentPlace={place} />;

  if (!featured) {
    const empty =
      page > 1
        ? { title: t("emptyPageTitle"), body: null, href: basePath, cta: t("firstPage") }
        : place
          ? { title: t("emptyTitle"), body: t("emptyBody", { place: placeLabel }), href: "/noticies", cta: t("viewAll") }
          : { title: t("emptyTitle"), body: t("emptyBodyIndex"), href: "/catalunya", cta: t("viewAgenda") };

    return (
      <>
        {chips}
        <div className="flex-center-col gap-element-gap py-section-y text-center">
          <h2 className="heading-3 text-foreground-strong" data-testid="not-found-title">
            {empty.title}
          </h2>
          {empty.body && <p className="body-normal max-w-2xl">{empty.body}</p>}
          <PressableAnchor href={empty.href} className="btn-primary" variant="plain">
            {empty.cta}
          </PressableAnchor>
        </div>
      </>
    );
  }

  const itemUrl = (item: (typeof items)[number]) =>
    toLocalizedUrl(`/noticies/${item.place.slug}/${item.slug}`, locale);
  const newsItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${toLocalizedUrl(basePath, locale)}#news-itemlist`,
    name: t("itemListName", { place: placeLabel }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "NewsArticle",
        "@id": itemUrl(item),
        url: itemUrl(item),
        headline: item.title,
        ...(item.imageUrl ? { image: item.imageUrl } : {}),
      },
    })),
  };

  return (
    <>
      <JsonLdServer id="news-place-itemlist" data={newsItemList} />
      {chips}
      {/* gap-5 matches the List grid, so the featured card sits like a row */}
      <div className="flex flex-col gap-5">
        <NewsCard
          event={featured}
          placeSlug={featured.place.slug}
          placeLabel={featured.place.label}
          variant="featured"
          priority
        />
        {rest.length > 0 && (
          <NewsCardGrid items={rest} place={fallbackPlace} placeLabel={placeLabel} />
        )}
        <NewsPagination basePath={basePath} page={page} totalPages={response.totalPages} />
      </div>
    </>
  );
}
