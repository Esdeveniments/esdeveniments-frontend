import { Suspense } from "react";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import {
  buildPageMeta,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import NewsList from "@components/noticies/NewsList";
import NewsListSkeleton from "@components/noticies/NewsListSkeleton";
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

  // Start fetches immediately
  const newsPromise = fetchNews({ page: currentPage, size: pageSize, place });
  const placeTypePromise = getPlaceTypeAndLabelCached(place);

  // We can await placeTypePromise if we want the title to be perfect immediately, 
  // but to be strictly non-blocking as requested, we use the slug for the shell 
  // and let the component handle the label.
  // However, the user asked to render Breadcrumbs and Title immediately.
  // Using the slug for the title is a good compromise.
  
  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Notícies", url: `${siteUrl}/noticies` },
    { name: place, url: `${siteUrl}/noticies/${place}` }, // Use slug initially or maybe we can't know the label yet
  ];
  
  // We can't generate the full WebPageSchema with the correct label without awaiting placeType.
  // But we can generate a basic one or wait for it inside a suspended component?
  // SEO components usually need to be in the head or early.
  // If we want non-blocking, we might have to sacrifice immediate perfect schema or use slug.
  // I'll use slug for now in the shell schema.
  
  const webPageSchema = generateWebPageSchema({
    title: `Notícies de ${place}`, 
    description: `Arxiu i recomanacions d'esdeveniments a ${place}`,
    url: `${siteUrl}/noticies/${place}`,
    breadcrumbs,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);

  return (
    <div className="container flex-col justify-center items-center mt-8">
      {/* Head links for prev/next are removed as they require data. 
          If critical, they should be in generateMetadata or we accept they load later? 
          Actually we can't inject into head from here easily if streaming. */}
      
      <JsonLdServer id="news-place-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-place-breadcrumbs" data={breadcrumbListSchema} />
      )}
      
      <nav
        aria-label="Breadcrumb"
        className="mb-3 w-full px-2 lg:px-0 text-sm text-foreground-strong/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <PressableAnchor
              href="/"
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              Inici
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <PressableAnchor
              href="/noticies"
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              Notícies
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-foreground-strong capitalize">{place}</li>
        </ol>
      </nav>
      <h1 className="uppercase mb-2 px-2 lg:px-0">
        Notícies de <span className="capitalize">{place}</span>
      </h1>
      <div className="w-full flex justify-end px-2 lg:px-0 mb-2 text-sm">
        <PressableAnchor
          href={`/noticies`}
          className="text-primary underline text-sm"
          prefetch={false}
          variant="inline"
        >
          Veure totes les notícies
        </PressableAnchor>
        <span className="mx-2">·</span>
        <PressableAnchor
          href={`/noticies/${place}/rss.xml`}
          className="text-primary underline text-sm"
          prefetch={false}
          variant="inline"
        >
          RSS
        </PressableAnchor>
      </div>
      
      <Suspense fallback={<NewsListSkeleton />}>
        <NewsList 
          newsPromise={newsPromise} 
          placeTypePromise={placeTypePromise} 
          place={place}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      </Suspense>
    </div>
  );
}
