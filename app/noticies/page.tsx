import { Suspense } from "react";
import { headers } from "next/headers";
import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import type { Metadata } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import Link from "next/link";
import { NEWS_HUBS, NEARBY_PLACES_BY_HUB } from "@utils/constants";
import { siteUrl } from "@config/index";
import Script from "next/script";
import type { NewsSummaryResponseDTO } from "types/api/news";
import {
  generateWebPageSchema,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Basic SEO for the news listing page
  return buildPageMeta({
    title: "Notícies | Esdeveniments.cat",
    description:
      "Les últimes notícies, recomanacions i plans culturals de Catalunya.",
    canonical: `${siteUrl}/noticies`,
  }) as unknown as Metadata;
}

export default async function Page() {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  // Fetch the most recent news per hub
  const hubResults = await Promise.all(
    NEWS_HUBS.map(async (hub) => {
      const res = await fetchNews({ page: 0, size: 1, place: hub.slug });
      return { hub, items: res.content };
    })
  );

  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Notícies", url: `${siteUrl}/noticies` },
  ];
  const webPageSchema = generateWebPageSchema({
    title: "Notícies",
    description: "Les últimes notícies i recomanacions d'esdeveniments.",
    url: `${siteUrl}/noticies`,
    breadcrumbs,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);

  // Structured data: ItemList for the first article of each hub
  const firstArticles = hubResults
    .map(({ hub, items }) =>
      items && items[0]
        ? { hub, item: items[0] as NewsSummaryResponseDTO }
        : null
    )
    .filter(
      (
        v
      ): v is {
        hub: { slug: string; name: string };
        item: NewsSummaryResponseDTO;
      } => v !== null
    );

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/noticies#news-itemlist`,
    name: "Últimes notícies per hub",
    numberOfItems: firstArticles.length,
    itemListElement: firstArticles.map(({ hub, item }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "NewsArticle",
        "@id": `${siteUrl}/noticies/${hub.slug}/${item.slug}`,
        url: `${siteUrl}/noticies/${hub.slug}/${item.slug}`,
        headline: item.title,
        ...(item.imageUrl ? { image: item.imageUrl } : {}),
      },
    })),
  };

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-8">
      <Script
        id="news-list-webpage-breadcrumbs"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      {breadcrumbListSchema && (
        <Script
          id="news-list-breadcrumbs"
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbListSchema),
          }}
        />
      )}
      <Script
        id="news-list-itemlist"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <h1 className="uppercase mb-2 px-2 lg:px-0">Notícies</h1>
      <p className="text-[16px] font-normal text-blackCorp text-left mb-8 px-2 font-barlow">
        Les últimes notícies i recomanacions d&apos;esdeveniments.
      </p>
      <div className="w-full flex justify-end px-2 lg:px-0 mb-4 text-sm">
        <Link
          href={`/noticies/rss.xml`}
          className="text-primary underline text-sm"
          prefetch={false}
        >
          RSS
        </Link>
      </div>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 px-2 lg:px-0 text-sm text-blackCorp/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:underline">
              Inici
            </Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-blackCorp">Notícies</li>
        </ol>
      </nav>
      <div className="flex flex-col gap-10 px-2 lg:px-0">
        {hubResults.map(({ hub, items }) => {
          const first = items?.[0];
          if (!first) return null;
          return (
            <section key={hub.slug} className="w-full">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="uppercase">{`Últimes notícies ${hub.name}`}</h2>
                <Link
                  href={`/noticies/${hub.slug}`}
                  className="text-primary underline text-sm"
                  prefetch={false}
                >
                  Veure més…
                </Link>
              </div>
              {NEARBY_PLACES_BY_HUB[hub.slug] && (
                <nav className="mb-3 text-xs text-blackCorp/70">
                  <span className="mr-2">A prop:</span>
                  {NEARBY_PLACES_BY_HUB[hub.slug].map((p, i) => (
                    <>
                      <Link
                        key={p.slug}
                        href={`/noticies/${p.slug}`}
                        prefetch={false}
                        className="underline hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      {i < NEARBY_PLACES_BY_HUB[hub.slug].length - 1 && (
                        <span className="mx-1">·</span>
                      )}
                    </>
                  ))}
                </nav>
              )}
              <Suspense
                fallback={
                  <div className="w-full h-12 bg-whiteCorp animate-pulse rounded-full" />
                }
              >
                <NewsCard
                  event={first}
                  placeSlug={hub.slug}
                  placeLabel={hub.name}
                  variant="hero"
                />
              </Suspense>
            </section>
          );
        })}
      </div>
    </div>
  );
}
