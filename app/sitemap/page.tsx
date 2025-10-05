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
import { Text } from "@components/ui/primitives";

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

      {/* Enhanced HTML structure */}
      <div
        className="flex w-full flex-col items-center justify-center px-component-md pb-3xl pt-component-xs sm:w-[580px] md:w-[768px] md:px-xs lg:w-[1024px]"
        role="main"
        data-testid="sitemap-page"
      >
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-component-md">
          <ol className="flex items-center space-x-2 text-blackCorp/80">
            <li>
              <Link href="/" className="hover:text-blackCorp">
                Inici
              </Link>
            </li>
            <li>
              <span className="mx-component-xs">/</span>
              <Text variant="body-sm" className="text-blackCorp">
                Arxiu
              </Text>
            </li>
          </ol>
        </nav>

        {/* Display regions */}
        <section className="mb-component-xl">
          <header className="mb-component-lg">
            <Text
              as="h1"
              variant="h1"
              className="mb-component-md"
              data-testid="sitemap-title"
            >
              Arxiu d'esdeveniments culturals
            </Text>
            <Text as="p" variant="body-lg" className="mb-component-md">
              Descobreix tot el què ha passat a Catalunya cada any. Navega per
              comarques i poblacions per trobar l'història cultural del
              territori.
            </Text>
          </header>

          <div className="mb-component-xl">
            <Text as="h2" variant="h2" className="mb-component-md">
              Comarques de Catalunya
            </Text>
            <div
              className="grid grid-cols-2 gap-component-xs md:grid-cols-3"
              role="list"
            >
              {regions.map((region) => (
                <div
                  key={region.slug}
                  className="mb-component-xs"
                  role="listitem"
                >
                  <Link
                    href={`/sitemap/${region.slug}`}
                    prefetch={false}
                    className="hover:text-blue-600 transition-colors hover:underline"
                    data-testid="sitemap-region-link"
                  >
                    <Text as="p" variant="body">
                      {region.name}
                    </Text>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Display cities */}
          <div>
            <Text as="h2" variant="h2" className="mb-component-md">
              Poblacions principals
            </Text>
            <div
              className="grid grid-cols-2 gap-component-xs md:grid-cols-4"
              role="list"
            >
              {cities.map((city) => (
                <div
                  key={city.slug}
                  className="mb-component-xs"
                  role="listitem"
                >
                  <Link
                    href={`/sitemap/${city.slug}`}
                    prefetch={false}
                    className="hover:text-blue-600 transition-colors hover:underline"
                    data-testid="sitemap-city-link"
                  >
                    <Text as="p" variant="body">
                      {city.name}
                    </Text>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer information */}
        <footer className="mt-component-2xl border-t border-bColor/50 pt-component-xl">
          <Text as="p" variant="body-sm" className="text-blackCorp/80">
            L'arxiu conté esdeveniments culturals de totes les comarques de
            Catalunya. Cada enllaç et porta a un històric detallat organitzat
            per anys i mesos.
          </Text>
        </footer>
      </div>
    </>
  );
}
