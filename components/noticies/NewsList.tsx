import NewsCard from "@components/ui/newsCard";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { NewsListProps } from "types/props";
import { notFound } from "next/navigation";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";

export default async function NewsList({
  newsPromise,
  placeTypePromise,
  place,
  currentPage,
  pageSize,
}: NewsListProps) {
  const [response, placeType] = await Promise.all([
    newsPromise,
    placeTypePromise,
  ]);
  const list = response.content;

  if (!list || list.length === 0) {
    return notFound();
  }

  const newsItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/noticies/${place}#news-itemlist`,
    name: `Notícies de ${placeType.label}`,
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
              pathname: `/noticies/${place}`,
              query: { page: String(currentPage - 1), size: String(pageSize) },
            }}
            prefetch={false}
            className="text-primary underline"
            variant="inline"
          >
            ← Anterior
          </PressableAnchor>
        ) : (
          <span />
        )}
        {!response.last && (
          <PressableAnchor
            href={{
              pathname: `/noticies/${place}`,
              query: { page: String(currentPage + 1), size: String(pageSize) },
            }}
            prefetch={false}
            className="text-primary underline"
            variant="inline"
          >
            Més notícies →
          </PressableAnchor>
        )}
      </div>
    </>
  );
}
