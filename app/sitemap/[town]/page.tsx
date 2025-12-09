import { Suspense } from "react";
import { headers } from "next/headers";
import { siteUrl } from "@config/index";
import { getAllYears, normalizeMonthParam } from "@lib/dates";
import { MONTHS_URL } from "@utils/constants";
// No headers/nonce needed with relaxed CSP
import JsonLdServer from "@components/partials/JsonLdServer";
import { getPlaceBySlug } from "@lib/api/places";
import { getTranslations } from "next-intl/server";
import type { TownStaticPathParams } from "types/common";
import { formatCatalanA } from "@utils/helpers";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";
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
  const t = await getTranslations("Pages.SitemapTown");
  const { town } = await params;
  const place = await getPlaceBySlug(town);
  const label = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatCatalanA(label, placeType, false);
  const locale = resolveLocaleFromHeaders(await headers());

  return buildPageMeta({
    title: t("metaTitle", { locationPhrase }),
    description: t("metaDescription", { locationPhrase, town }),
    canonical: `${siteUrl}/sitemap/${town}`,
    locale,
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
  const t = await getTranslations("Pages.SitemapTown");
  const years: number[] = getAllYears();
  
  // Start fetch
  const placePromise = getPlaceBySlug(town);

  // We use town (slug) for breadcrumbs initially to be fast?
  // Or we can wait for placePromise?
  // The user said "Start rendering the grid of years... immediately. Resolve the place details... inside a suspended component header."
  // So we should NOT await placePromise for the main return.
  
  const breadcrumbs = [
    { name: t("breadcrumbs.home"), url: siteUrl },
    { name: t("breadcrumbs.archive"), url: `${siteUrl}/sitemap` },
    { name: town, url: `${siteUrl}/sitemap/${town}` }, // Use slug as fallback
  ];


  // Use slug for schema to avoid blocking on place fetch
  const collectionPageSchema = generateCollectionPageSchema({
    title: t("collectionTitle", { town }),
    description: t("collectionDescription", { town }),
    url: `${siteUrl}/sitemap/${town}`,
    breadcrumbs,
    numberOfItems: years.length * MONTHS_URL.length,
    mainEntity: {
      "@type": "ItemList",
      "@id": `${siteUrl}/sitemap/${town}#archivelist`,
      name: t("mainEntityName", { town }),
      description: t("mainEntityDescription", { town }),
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
                  const { slug, label } = normalizeMonthParam(month);
                  return (
                    <div key={`${year}-${month}`} role="listitem">
                      <PressableAnchor
                        href={`/sitemap/${town}/${year}/${slug}`}
                        className="text-foreground-strong hover:text-primary hover:underline transition-colors capitalize"
                        variant="inline"
                        prefetch={false}
                      >
                        {label}
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
              <h3 className="heading-4">{t("aboutTitle")}</h3>
              <p className="body-small text-foreground/80">
                {t("aboutBody", { town })}
              </p>
            </div>
            <div className="stack gap-2">
              <h3 className="heading-4">{t("quickNavTitle")}</h3>
              <p className="body-small text-foreground/80">
                {t("quickNavBody")}
              </p>
            </div>
          </div>
        </footer>
      </SitemapLayout>
    </>
  );
}
