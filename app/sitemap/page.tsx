import { siteUrl } from "@config/index";
import { fetchRegions } from "@lib/api/regions";
import { fetchCities } from "@lib/api/cities";
import { headers } from "next/headers";
import Link from "next/link";
import Script from "next/script";
import type { RegionSummaryResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import {
  buildPageMeta,
  generateWebPageSchema,
  generateSiteNavigationElementSchema,
} from "@components/partials/seo-meta";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";

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

export default async function Page() {
  const { regions, cities } = await getData();

  // Read the nonce from the middleware headers
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

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

  // Generate navigation schema for regions and cities
  const regionNavigation = regions.map((region) => ({
    name: region.name,
    url: `${siteUrl}/sitemap/${region.slug}`,
  }));

  const cityNavigation = cities.slice(0, 50).map((city) => ({
    name: city.name,
    url: `${siteUrl}/sitemap/${city.slug}`,
  }));

  const siteNavigationSchema = generateSiteNavigationElementSchema([
    ...regionNavigation,
    ...cityNavigation,
  ]);

  return (
    <>
      {/* Structured Data */}
      <Script
        id="webpage-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema),
        }}
      />
      <Script
        id="site-navigation-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(siteNavigationSchema),
        }}
      />

      <SitemapLayout testId="sitemap-page">
        <SitemapBreadcrumb items={breadcrumbs} />

        <section className="stack gap-8">
          <header>
            <h1 className="heading-1 mb-4" data-testid="sitemap-title">
              Arxiu d&apos;esdeveniments culturals
            </h1>
            <p className="body-large text-foreground">
              Descobreix tot el què ha passat a Catalunya cada any. Navega per
              comarques i poblacions per trobar l&apos;història cultural del
              territori.
            </p>
          </header>

          <div className="stack gap-6">
            <h2 className="heading-2">Comarques de Catalunya</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4" role="list">
              {regions.map((region) => (
                <div key={region.slug} role="listitem">
                  <Link
                    href={`/sitemap/${region.slug}`}
                    prefetch={false}
                    className="text-foreground-strong hover:text-primary hover:underline transition-colors"
                    data-testid="sitemap-region-link"
                  >
                    {region.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="stack gap-6">
            <h2 className="heading-2">Poblacions principals</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list">
              {cities.map((city) => (
                <div key={city.slug} role="listitem">
                  <Link
                    href={`/sitemap/${city.slug}`}
                    prefetch={false}
                    className="text-foreground-strong hover:text-primary hover:underline transition-colors"
                    data-testid="sitemap-city-link"
                  >
                    {city.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

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
