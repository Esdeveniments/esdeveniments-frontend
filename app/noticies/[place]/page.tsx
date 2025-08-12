import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import type { Metadata } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import Link from "next/link";
import { siteUrl } from "@config/index";
import Script from "next/script";
import { generateWebPageSchema } from "@components/partials/seo-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place } = await params;
  const placeType = await getPlaceTypeAndLabel(place);
  return buildPageMeta({
    title: `Notícies de ${placeType.label} | Esdeveniments.cat`,
    description: `Arxiu i recomanacions d'esdeveniments a ${placeType.label}`,
    canonical: `/noticies/${place}`,
  }) as unknown as Metadata;
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

  const [response, headersList, placeType] = await Promise.all([
    fetchNews({ page: currentPage, size: pageSize, place }),
    headers(),
    getPlaceTypeAndLabel(place),
  ]);
  const items = response.content;

  if (!items || items.length === 0) {
    return notFound();
  }

  const list = items;

  const nonce = headersList.get("x-nonce") || "";
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

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-8">
      <Script
        id="news-place-webpage-breadcrumbs"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-3 w-full px-2 lg:px-0 text-sm text-blackCorp/70"
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
          <li>
            <Link href="/noticies" className="hover:underline">
              Notícies
            </Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-blackCorp capitalize">{place}</li>
        </ol>
      </nav>
      <h1 className="uppercase mb-2 px-2 lg:px-0">
        Notícies de {placeType.label}
      </h1>
      <div className="w-full flex justify-end px-2 lg:px-0 mb-2 text-sm">
        <Link
          href={`/noticies`}
          className="text-primary underline text-sm"
          prefetch={false}
        >
          Veure totes les notícies
        </Link>
      </div>
      <section className="flex flex-col gap-6">
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
          <Link
            href={{
              pathname: `/noticies/${place}`,
              query: { page: String(currentPage - 1), size: String(pageSize) },
            }}
            prefetch={false}
            className="text-primary underline"
          >
            ← Anterior
          </Link>
        ) : (
          <span />
        )}
        {!response.last && (
          <Link
            href={{
              pathname: `/noticies/${place}`,
              query: { page: String(currentPage + 1), size: String(pageSize) },
            }}
            prefetch={false}
            className="text-primary underline"
          >
            Més notícies →
          </Link>
        )}
      </div>
    </div>
  );
}
