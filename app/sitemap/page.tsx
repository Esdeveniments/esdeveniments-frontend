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
        className="w-full flex flex-col justify-center items-center pt-2 pb-14 sm:w-[580px] md:w-[768px] lg:w-[1024px] px-4 md:px-0"
        role="main"
      >
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-gray-800">
                Inici
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="text-gray-800">Arxiu</span>
            </li>
          </ol>
        </nav>

        {/* Display regions */}
        <section className="mb-8">
          <header className="mb-6">
            <h1 className="text-3xl font-bold mb-4">
              Arxiu d&apos;esdeveniments culturals
            </h1>
            <p className="mb-4 text-lg text-gray-700">
              Descobreix tot el què ha passat a Catalunya cada any. Navega per
              comarques i poblacions per trobar l&apos;història cultural del
              territori.
            </p>
          </header>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              Comarques de Catalunya
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2" role="list">
              {regions.map((region) => (
                <div key={region.slug} className="mb-2" role="listitem">
                  <Link
                    href={`/sitemap/${region.slug}`}
                    prefetch={false}
                    className="hover:underline hover:text-blue-600 transition-colors"
                  >
                    <p className="text-gray-900">{region.name}</p>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Display cities */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold">
              Poblacions principals
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="list">
              {cities.map((city) => (
                <div key={city.slug} className="mb-2" role="listitem">
                  <Link
                    href={`/sitemap/${city.slug}`}
                    prefetch={false}
                    className="hover:underline hover:text-blue-600 transition-colors"
                  >
                    <p className="text-gray-900">{city.name}</p>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer information */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            L&apos;arxiu conté esdeveniments culturals de totes les comarques de
            Catalunya. Cada enllaç et porta a un històric detallat organitzat
            per anys i mesos.
          </p>
        </footer>
      </div>
    </>
  );
}
