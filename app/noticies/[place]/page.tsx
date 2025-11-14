import { notFound } from "next/navigation";
import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import type { Metadata } from "next";
import {
  buildPageMeta,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { PendingLink } from "@components/ui/navigation/PendingLink";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import Head from "next/head";
import JsonLdServer from "@components/partials/JsonLdServer";
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place } = await params;
  const placeType = await getPlaceTypeAndLabelCached(place);
  const base = buildPageMeta({
    title: `Notícies de ${placeType.label} | Esdeveniments.cat`,
    description: `Arxiu i recomanacions d'esdeveniments a ${placeType.label}`,
    canonical: `${siteUrl}/noticies/${place}`,
  }) as unknown as Metadata;
  return {
    ...base,
    alternates: {
      ...(base.alternates || {}),
      types: {
        ...((base.alternates && base.alternates.types) || {}),
        "application/rss+xml": [
          {
            url: `/noticies/${place}/rss.xml`,
            title: `RSS Notícies ${placeType.label}`,
          },
        ],
      },
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ place: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { place } = await params;
  const query = (await (searchParams || Promise.resolve({}))) as {
    [key: string]: string | string[] | undefined;
  };
  const pageParam =
    typeof query.page === "string"
      ? query.page
      : Array.isArray(query.page)
      ? query.page[0]
      : undefined;
  const sizeParam =
    typeof query.size === "string"
      ? query.size
      : Array.isArray(query.size)
      ? query.size[0]
      : undefined;
  const currentPage = Number.isFinite(Number(pageParam))
    ? Number(pageParam)
    : 0;
  const pageSize = Number.isFinite(Number(sizeParam)) ? Number(sizeParam) : 10;

  const [response, placeType] = await Promise.all([
    fetchNews({ page: currentPage, size: pageSize, place }),
    getPlaceTypeAndLabelCached(place),
  ]);
  const items = response.content;

  if (!items || items.length === 0) {
    return notFound();
  }

  const list = items;

  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Notícies", url: `${siteUrl}/noticies` },
    { name: placeType.label, url: `${siteUrl}/noticies/${place}` },
  ];
  const webPageSchema = generateWebPageSchema({
    title: `Notícies de ${placeType.label}`,
    description: `Arxiu i recomanacions d'esdeveniments a ${placeType.label}`,
    url: `${siteUrl}/noticies/${place}`,
    breadcrumbs,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);
  const newsItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}/noticies/${place}#news-itemlist`,
    name: `Notícies de ${placeType.label}`,
    numberOfItems: list.length,
    itemListElement: list.map((item, index) => ({
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
    <div className="container flex-col justify-center items-center mt-8">
      <Head>
        {currentPage > 0 && (
          <link
            rel="prev"
            href={`${siteUrl}/noticies/${place}?page=${
              currentPage - 1
            }&size=${pageSize}`}
          />
        )}
        {!response.last && (
          <link
            rel="next"
            href={`${siteUrl}/noticies/${place}?page=${
              currentPage + 1
            }&size=${pageSize}`}
          />
        )}
      </Head>
      <JsonLdServer id="news-place-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-place-breadcrumbs" data={breadcrumbListSchema} />
      )}
      <JsonLdServer id="news-place-itemlist" data={newsItemList} />
      <nav
        aria-label="Breadcrumb"
        className="mb-3 w-full px-2 lg:px-0 text-sm text-foreground-strong/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <PendingLink href="/" className="hover:underline">
              Inici
            </PendingLink>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <PendingLink href="/noticies" className="hover:underline">
              Notícies
            </PendingLink>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-foreground-strong capitalize">{place}</li>
        </ol>
      </nav>
      <h1 className="uppercase mb-2 px-2 lg:px-0">
        Notícies de {placeType.label}
      </h1>
      <div className="w-full flex justify-end px-2 lg:px-0 mb-2 text-sm">
        <PendingLink
          href={`/noticies`}
          className="text-primary underline text-sm"
        >
          Veure totes les notícies
        </PendingLink>
        <span className="mx-2">·</span>
        <PendingLink
          href={`/noticies/${place}/rss.xml`}
          className="text-primary underline text-sm"
        >
          RSS
        </PendingLink>
      </div>
      <section className="flex flex-col gap-6 px-2 lg:px-0">
        {list.map((event, index) => (
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
          <PendingLink
            href={{
              pathname: `/noticies/${place}`,
              query: { page: String(currentPage - 1), size: String(pageSize) },
            }}
            className="text-primary underline"
          >
            ← Anterior
          </PendingLink>
        ) : (
          <span />
        )}
        {!response.last && (
          <PendingLink
            href={{
              pathname: `/noticies/${place}`,
              query: { page: String(currentPage + 1), size: String(pageSize) },
            }}
            className="text-primary underline"
          >
            Més notícies →
          </PendingLink>
        )}
      </div>
    </div>
  );
}
