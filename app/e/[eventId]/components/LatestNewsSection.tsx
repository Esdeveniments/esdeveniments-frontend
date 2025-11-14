import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import { PendingLink } from "@components/ui/navigation/PendingLink";
import { formatCatalanA } from "@utils/helpers";
import type { LatestNewsSectionProps } from "types/props";

export default async function LatestNewsSection({
  placeSlug,
  placeLabel,
  placeType,
  newsHref,
}: LatestNewsSectionProps) {
  const newsResponse = await fetchNews({ page: 0, size: 3, place: placeSlug });
  const latestNews = newsResponse.content || [];

  if (latestNews.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-background pb-8">
      <section className="container w-full flex flex-col gap-element-gap">
        <div className="w-full flex items-center justify-between">
          <h2 className="heading-2">
            Últimes notícies{" "}
            {placeLabel && placeSlug !== "catalunya"
              ? formatCatalanA(placeLabel, placeType, false)
              : ""}
          </h2>
          <PendingLink
            href={newsHref}
            className="body-small text-primary underline hover:no-underline"
          >
            Veure totes
          </PendingLink>
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
