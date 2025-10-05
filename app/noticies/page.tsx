import { Suspense } from "react";
import { headers } from "next/headers";
import { fetchNews } from "@lib/api/news";
import { Card, Text } from "@components/ui/primitives";
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
    }),
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
        : null,
    )
    .filter(
      (
        v,
      ): v is {
        hub: { slug: string; name: string };
        item: NewsSummaryResponseDTO;
      } => v !== null,
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
    <div className="mt-component-xl w-full flex-col items-center justify-center sm:w-[580px] md:w-[768px] lg:w-[1024px]">
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
      <Text
        as="h1"
        variant="h1"
        className="mb-component-xs px-component-xs uppercase lg:px-xs"
      >
        Notícies
      </Text>
      <Text
        as="p"
        variant="body"
        className="mb-component-xl px-component-xs text-left font-barlow text-[16px] font-normal"
      >
        Les últimes notícies i recomanacions d&apos;esdeveniments.
      </Text>
      <div className="mb-component-md flex w-full justify-end px-component-xs lg:px-xs">
        <Link
          href={`/noticies/rss.xml`}
          className="text-primary underline"
          prefetch={false}
        >
          <Text variant="body-sm">RSS</Text>
        </Link>
      </div>
      <nav
        aria-label="Breadcrumb"
        className="mb-component-lg px-component-xs text-blackCorp/70 lg:px-xs"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:underline">
              Inici
            </Link>
          </li>
          <li>
            <span className="mx-xs">/</span>
          </li>
          <li>
            <Text variant="body-sm" className="text-blackCorp">
              Notícies
            </Text>
          </li>
        </ol>
      </nav>
      <div className="flex flex-col gap-2xl px-component-xs lg:px-xs">
        {hubResults.map(({ hub, items }) => {
          const first = items?.[0];
          if (!first) return null;
          return (
            <section key={hub.slug} className="w-full">
              <div className="mb-component-xs flex items-baseline justify-between">
                <Text
                  as="h2"
                  variant="h2"
                  className="uppercase"
                >{`Últimes notícies ${hub.name}`}</Text>
                <Link
                  href={`/noticies/${hub.slug}`}
                  className="text-primary underline"
                  prefetch={false}
                >
                  <Text variant="body-sm">Veure més…</Text>
                </Link>
              </div>
              {NEARBY_PLACES_BY_HUB[hub.slug] && (
                <nav className="mb-component-sm text-blackCorp/70">
                  <Text variant="caption" className="mr-component-xs">
                    A prop:
                  </Text>
                  {NEARBY_PLACES_BY_HUB[hub.slug].map((p, i) => (
                    <>
                      <Link
                        key={p.slug}
                        href={`/noticies/${p.slug}`}
                        prefetch={false}
                        className="underline hover:text-primary"
                      >
                        <Text variant="caption">{p.name}</Text>
                      </Link>
                      {i < NEARBY_PLACES_BY_HUB[hub.slug].length - 1 && (
                        <span className="mx-xs">·</span>
                      )}
                    </>
                  ))}
                </nav>
              )}
              <Suspense
                fallback={
                  <div className="h-12 w-full animate-pulse rounded-full bg-whiteCorp" />
                }
              >
                <Card
                  type="news"
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
