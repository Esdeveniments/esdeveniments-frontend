import { Suspense } from "react";
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
import SitemapHeader from "@components/sitemap/SitemapHeader";
import SitemapHeaderSkeleton from "@components/sitemap/SitemapHeaderSkeleton";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

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

export default function Page({
  params,
}: {
  params: Promise<TownStaticPathParams>;
}) {
  return (
    <Suspense fallback={<SitemapSkeleton />}>
      <AsyncPage params={params} />
    </Suspense>
  );
}

async function AsyncPage({ params }: { params: Promise<TownStaticPathParams> }) {
  const { town } = await params;
  const years: number[] = getAllYears();
  
  // Start fetch
  const placePromise = getPlaceBySlug(town);

  // We use town (slug) for breadcrumbs initially to be fast?
  // Or we can wait for placePromise?
  // The user said "Start rendering the grid of years... immediately. Resolve the place details... inside a suspended component header."
  // So we should NOT await placePromise for the main return.
  
  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Arxiu", url: `${siteUrl}/sitemap` },
    { name: town, url: `${siteUrl}/sitemap/${town}` }, // Use slug as fallback
  ];


  // Use slug for schema to avoid blocking on place fetch
  const collectionPageSchema = generateCollectionPageSchema({
    title: `Arxiu de ${town}`,
    description: `Històric d'esdeveniments culturals de ${town} organitzat per anys i mesos`,
    url: `${siteUrl}/sitemap/${town}`,
    breadcrumbs,
    numberOfItems: years.length * MONTHS_URL.length,
    mainEntity: {
      "@type": "ItemList",
      "@id": `${siteUrl}/sitemap/${town}#archivelist`,
      name: `Arxiu històric de ${town}`,
      description: `Col·lecció d'esdeveniments culturals de ${town}`,
      numberOfItems: years.length * MONTHS_URL.length,
      itemListElement: [], // Empty for now or we'd have to map all years which is fast
    },
  });

  return (
    <>
      {/* Structured Data */}
      <JsonLdServer id="collectionpage-schema" data={collectionPageSchema} />

      <SitemapLayout>
        <SitemapBreadcrumb items={breadcrumbs} />

        <Suspense fallback={<SitemapHeaderSkeleton />}>
          <SitemapHeader town={town} placePromise={placePromise} />
        </Suspense>

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
                culturals de {town} organitzats cronològicament. Cada mes
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
