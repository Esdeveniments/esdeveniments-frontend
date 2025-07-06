import { siteUrl } from "@config/index";
import { getAllYears } from "@lib/dates";
import { MONTHS_URL } from "@utils/constants";
import Link from "next/link";
import Script from "next/script";
import { fetchPlaceBySlug } from "@lib/api/places";
import type { TownStaticPathParams } from "types/common";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<TownStaticPathParams>;
}) {
  const { town } = await params;
  const place = await fetchPlaceBySlug(town);
  const label = place?.name || town;
  return buildPageMeta({
    title: `Arxiu. Descobreix tot el que ha passat a ${label} - Esdeveniments.cat`,
    description: `Descobreix tot el què ha passat a ${label} cada any. Les millors propostes culturals per esprémer al màxim de ${town} - Arxiu - Esdeveniments.cat`,
    canonical: `${siteUrl}/sitemap/${town}`,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<TownStaticPathParams>;
}) {
  const { town } = await params;
  const years: number[] = getAllYears();
  const place = await fetchPlaceBySlug(town);
  const label = place?.name || town;

  // Generate structured data for the region/city sitemap
  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Arxiu", url: `${siteUrl}/sitemap` },
    { name: label, url: `${siteUrl}/sitemap/${town}` },
  ];

  // Generate collection page schema with navigation items
  const navigationItems = years.flatMap((year) =>
    MONTHS_URL.map((month) => ({
      "@type": "SiteNavigationElement",
      name: `${label} - ${month} ${year}`,
      url: `${siteUrl}/sitemap/${town}/${year}/${month}`,
    }))
  );

  const collectionPageSchema = generateCollectionPageSchema({
    title: `Arxiu de ${label}`,
    description: `Històric d'esdeveniments culturals de ${label} organitzat per anys i mesos`,
    url: `${siteUrl}/sitemap/${town}`,
    breadcrumbs,
    numberOfItems: years.length * MONTHS_URL.length,
    mainEntity: {
      "@type": "ItemList",
      "@id": `${siteUrl}/sitemap/${town}#archivelist`,
      name: `Arxiu històric de ${label}`,
      description: `Col·lecció d'esdeveniments culturals de ${label}`,
      numberOfItems: years.length * MONTHS_URL.length,
      itemListElement: navigationItems.slice(0, 100), // Limit for performance
    },
  });

  return (
    <>
      {/* Structured Data */}
      <Script
        id="collectionpage-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageSchema),
        }}
      />

      <div
        className="w-full flex flex-col justify-center items-center pt-2 pb-14 sm:w-[580px] md:w-[768px] lg:w-[1024px] px-4 md:px-0"
        role="main"
      >
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4 w-full">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-gray-800">
                Inici
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <Link href="/sitemap" className="hover:text-gray-800">
                Arxiu
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="text-gray-800">{label}</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="reset-this mb-6 w-full">
          <h1 className="pb-4 text-3xl font-bold">Arxiu històric de {label}</h1>
          <p className="text-lg text-gray-700 mb-4">
            Descobreix l&apos;evolució cultural de {label} any rere any. Cada
            enllaç et porta als esdeveniments d&apos;un mes específic.
          </p>
        </header>

        {/* Archive Grid */}
        <section className="grid overflow-hidden grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-2 grid-flow-row w-full">
          {years?.map((year) => (
            <article key={year} className="box">
              <header className="reset-this">
                <h2 className="pb-2 text-xl font-semibold">{year}</h2>
              </header>
              <nav role="list" className="space-y-1">
                {MONTHS_URL.map((month) => {
                  let textMonth: string = month;
                  if (month === "marc") textMonth = month.replace("c", "ç");
                  return (
                    <div
                      key={`${year}-${month}`}
                      className="box py-1"
                      role="listitem"
                    >
                      <Link
                        href={`/sitemap/${town}/${year}/${month.toLocaleLowerCase()}`}
                        prefetch={false}
                        className="hover:underline hover:text-blue-600 transition-colors"
                      >
                        <p className="text-md capitalize text-gray-900">
                          {textMonth}
                        </p>
                      </Link>
                    </div>
                  );
                }).reverse()}
              </nav>
            </article>
          ))}
        </section>

        {/* Footer information */}
        <footer className="mt-12 pt-8 border-t border-gray-200 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Sobre aquest arxiu</h3>
              <p className="text-sm text-gray-600">
                Aquest arxiu conté una recopilació d&apos;esdeveniments
                culturals de {label} organitzats cronològicament. Cada mes
                inclou teatre, música, art, festivals i altres activitats
                culturals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Navegació ràpida</h3>
              <p className="text-sm text-gray-600">
                Utilitza els enllaços per navegar directament a un mes
                específic. Els anys més recents apareixen primer per facilitar
                la cerca.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
