import { Suspense } from "react";
import { siteUrl } from "@config/index";
import { fetchRegions } from "@lib/api/regions";
import { fetchCities } from "@lib/api/cities";
// No headers/nonce needed with relaxed CSP
import JsonLdServer from "@components/partials/JsonLdServer";
import type { RegionSummaryResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import {
  buildPageMeta,
  generateWebPageSchema,
} from "@components/partials/seo-meta";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";
import SitemapContent from "@components/sitemap/SitemapContent";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

export const revalidate = 86400;

export const metadata = buildPageMeta({
  title: "Arxiu. Descobreix tot el que passa a Catalunya - Esdeveniments.cat",
  description:
    "Descobreix tot el què ha passat a Catalunya cada any. Les millors propostes culturals per esprémer al màxim de Catalunya - Arxiu - Esdeveniments.cat",
  canonical: `${siteUrl}/sitemap`,
});

async function getData(): Promise<{
  regions: RegionSummaryResponseDTO[];
  cities: CitySummaryResponseDTO[];
}> {
  const [regions, cities] = await Promise.all([fetchRegions(), fetchCities()]);

  return { regions, cities };
}

export default function Page() {
  const dataPromise = getData();

  // Generate structured data for the sitemap
  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Arxiu", url: `${siteUrl}/sitemap` },
  ];

  const webPageSchema = generateWebPageSchema({
    title: "Arxiu - Esdeveniments.cat",
    description: "Descobreix tot el què ha passat a Catalunya cada any",
    url: `${siteUrl}/sitemap`,
    breadcrumbs,
    mainContentOfPage: {
      "@type": "WebPageElement",
      "@id": `${siteUrl}/sitemap#maincontent`,
      name: "Sitemap principal",
      about: {
        "@type": "Thing",
        name: "Arxiu d'esdeveniments culturals de Catalunya",
      },
    },
  });

  return (
    <>
      {/* Structured Data */}
      <JsonLdServer id="webpage-schema" data={webPageSchema} />
      
      <SitemapLayout testId="sitemap-page">
        <SitemapBreadcrumb items={breadcrumbs} />

        <Suspense fallback={<SitemapSkeleton />}>
          <SitemapContent dataPromise={dataPromise} />
        </Suspense>

        <footer className="pt-8 border-t border-border">
          <p className="body-small text-foreground/80">
            L&apos;arxiu conté esdeveniments culturals de totes les comarques de
            Catalunya. Cada enllaç et porta a un històric detallat organitzat
            per anys i mesos.
          </p>
        </footer>
      </SitemapLayout>
    </>
  );
}
