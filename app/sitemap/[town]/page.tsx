import { siteUrl } from "@config/index";
import { getAllYears } from "@lib/dates";
import { MONTHS_URL } from "@utils/constants";
import { headers } from "next/headers";
import Link from "next/link";
import Script from "next/script";
import { fetchPlaceBySlug } from "@lib/api/places";
import type { TownStaticPathParams } from "types/common";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import { Text } from "@components/ui/primitives";

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

  // Read the nonce from the middleware headers
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

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
    })),
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
        nonce={nonce}
      />

      <div
        className="flex w-full flex-col items-center justify-center px-component-md pb-3xl pt-component-xs sm:w-[580px] md:w-[768px] md:px-xs lg:w-[1024px]"
        role="main"
      >
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-component-md w-full">
          <ol className="flex items-center space-x-2 text-blackCorp/80">
            <li>
              <Link href="/" className="hover:text-blackCorp">
                Inici
              </Link>
            </li>
            <li>
              <span className="mx-component-xs">/</span>
              <Link href="/sitemap" className="hover:text-blackCorp">
                Arxiu
              </Link>
            </li>
            <li>
              <span className="mx-component-xs">/</span>
              <Text variant="body-sm" className="text-blackCorp">
                {label}
              </Text>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="reset-this mb-component-lg w-full">
          <Text as="h1" variant="h1" className="pb-component-md font-bold">
            Arxiu històric de {label}
          </Text>
          <Text as="p" variant="body-lg" className="mb-component-md">
            Descobreix l'evolució cultural de {label} any rere any. Cada enllaç
            et porta als esdeveniments d'un mes específic.
          </Text>
        </header>

        {/* Archive Grid */}
        <section className="grid w-full grid-flow-row auto-rows-auto grid-cols-2 gap-component-xs overflow-hidden lg:grid-cols-4">
          {years?.map((year) => (
            <article key={year} className="box">
              <header className="reset-this">
                <Text
                  as="h2"
                  variant="h2"
                  className="pb-component-xs font-semibold"
                >
                  {year}
                </Text>
              </header>
              <nav role="list" className="space-y-1">
                {MONTHS_URL.map((month) => {
                  let textMonth: string = month;
                  if (month === "marc") textMonth = month.replace("c", "ç");
                  return (
                    <div
                      key={`${year}-${month}`}
                      className="box py-component-xs"
                      role="listitem"
                    >
                      <Link
                        href={`/sitemap/${town}/${year}/${month.toLocaleLowerCase()}`}
                        prefetch={false}
                        className="hover:text-blue-600 transition-colors hover:underline"
                      >
                        <Text
                          as="p"
                          variant="body"
                          className="capitalize text-blackCorp"
                        >
                          {textMonth}
                        </Text>
                      </Link>
                    </div>
                  );
                }).reverse()}
              </nav>
            </article>
          ))}
        </section>

        {/* Footer information */}
        <footer className="mt-component-2xl w-full border-t border-bColor/50 pt-component-xl">
          <div className="grid grid-cols-1 gap-component-lg md:grid-cols-2">
            <div>
              <Text
                as="h3"
                variant="h3"
                className="mb-component-xs font-semibold"
              >
                Sobre aquest arxiu
              </Text>
              <Text as="p" variant="body-sm" className="text-blackCorp/80">
                Aquest arxiu conté una recopilació d'esdeveniments culturals de{" "}
                {label} organitzats cronològicament. Cada mes inclou teatre,
                música, art, festivals i altres activitats culturals.
              </Text>
            </div>
            <div>
              <Text
                as="h3"
                variant="h3"
                className="mb-component-xs font-semibold"
              >
                Navegació ràpida
              </Text>
              <Text as="p" variant="body-sm" className="text-blackCorp/80">
                Utilitza els enllaços per navegar directament a un mes
                específic. Els anys més recents apareixen primer per facilitar
                la cerca.
              </Text>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
