import { siteUrl } from "@config/index";
import { getAllYears } from "@lib/dates";
import { MONTHS_URL } from "@utils/constants";
// No headers/nonce needed with relaxed CSP
import JsonLdServer from "@components/partials/JsonLdServer";
import { getPlaceBySlug } from "@lib/api/places";
import type { TownStaticPathParams } from "types/common";
import { formatCatalanA } from "@utils/helpers";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<TownStaticPathParams>;
}) {
  const { town } = await params;
  const place = await getPlaceBySlug(town);
  const label = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatCatalanA(label, placeType, false);

  return buildPageMeta({
    title: `Arxiu. Descobreix tot el que ha passat ${locationPhrase} - Esdeveniments.cat`,
    description: `Descobreix tot el què ha passat ${locationPhrase} cada any. Les millors propostes culturals per esprémer al màxim de ${town} - Arxiu - Esdeveniments.cat`,
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
  const place = await getPlaceBySlug(town);
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
      <JsonLdServer id="collectionpage-schema" data={collectionPageSchema} />

      <SitemapLayout>
        <SitemapBreadcrumb items={breadcrumbs} />

        <header>
          <h1 className="heading-1 mb-4">Arxiu històric de {label}</h1>
          <p className="body-large text-foreground">
            Descobreix l&apos;evolució cultural de {label} any rere any. Cada
            enllaç et porta als esdeveniments d&apos;un mes específic.
          </p>
        </header>

        <section className="grid overflow-hidden grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4 grid-flow-row w-full">
          {years?.map((year) => (
            <article key={year} className="stack gap-4">
              <h2 className="heading-3">{year}</h2>
              <nav role="list" className="stack gap-1">
                {MONTHS_URL.map((month) => {
                  let textMonth: string = month;
                  if (month === "marc") textMonth = month.replace("c", "ç");
                  return (
                    <div key={`${year}-${month}`} role="listitem">
                      <PressableAnchor
                        href={`/sitemap/${town}/${year}/${month.toLocaleLowerCase()}`}
                        className="text-foreground-strong hover:text-primary hover:underline transition-colors capitalize"
                        variant="inline"
                        prefetch={false}
                      >
                        {textMonth}
                      </PressableAnchor>
                    </div>
                  );
                }).reverse()}
              </nav>
            </article>
          ))}
        </section>

        <footer className="pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="stack gap-2">
              <h3 className="heading-4">Sobre aquest arxiu</h3>
              <p className="body-small text-foreground/80">
                Aquest arxiu conté una recopilació d&apos;esdeveniments
                culturals de {label} organitzats cronològicament. Cada mes
                inclou teatre, música, art, festivals i altres activitats
                culturals.
              </p>
            </div>
            <div className="stack gap-2">
              <h3 className="heading-4">Navegació ràpida</h3>
              <p className="body-small text-foreground/80">
                Utilitza els enllaços per navegar directament a un mes
                específic. Els anys més recents apareixen primer per facilitar
                la cerca.
              </p>
            </div>
          </div>
        </footer>
      </SitemapLayout>
    </>
  );
}
