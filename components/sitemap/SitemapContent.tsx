import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { generateSiteNavigationElementSchema } from "@components/partials/seo-meta";
import type { SitemapContentProps } from "types/sitemap";

export default async function SitemapContent({
  dataPromise,
}: SitemapContentProps) {
  const t = await getTranslations("Components.SitemapContent");
  const { regions, cities } = await dataPromise;

  // Sort regions and cities by name
  const sortedRegions = [...regions].sort((a, b) =>
    a.name.localeCompare(b.name, "ca")
  );
  const sortedCities = [...cities].sort((a, b) =>
    a.name.localeCompare(b.name, "ca")
  );

  // Generate navigation schema for regions and cities
  const regionNavigation = sortedRegions.map((region) => ({
    name: region.name,
    url: `${siteUrl}/sitemap/${region.slug}`,
  }));

  const cityNavigation = sortedCities.slice(0, 50).map((city) => ({
    name: city.name,
    url: `${siteUrl}/sitemap/${city.slug}`,
  }));

  const siteNavigationSchema = generateSiteNavigationElementSchema([
    ...regionNavigation,
    ...cityNavigation,
  ]);

  return (
    <>
      {siteNavigationSchema && (
        <JsonLdServer
          id="site-navigation-schema"
          data={siteNavigationSchema}
        />
      )}

      <section className="stack gap-8">
        <header>
          <h1 className="heading-1 mb-4" data-testid="sitemap-title">
            {t("title")}
          </h1>
          <p className="body-large text-foreground">
            {t("description")}
          </p>
        </header>

        <div className="stack gap-6">
          <h2 className="heading-2">{t("regionsTitle")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" role="list">
            {sortedRegions.map((region) => (
              <div key={region.slug} role="listitem">
                <PressableAnchor
                  href={`/sitemap/${region.slug}`}
                  className="text-foreground-strong hover:text-primary hover:underline transition-colors"
                  data-testid="sitemap-region-link"
                  variant="inline"
                >
                  {region.name}
                </PressableAnchor>
              </div>
            ))}
          </div>
        </div>

        <div className="stack gap-6">
          <h2 className="heading-2">{t("citiesTitle")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list">
            {sortedCities.map((city) => (
              <div key={city.slug} role="listitem">
                <PressableAnchor
                  href={`/sitemap/${city.slug}`}
                  className="text-foreground-strong hover:text-primary hover:underline transition-colors"
                  data-testid="sitemap-city-link"
                  variant="inline"
                >
                  {city.name}
                </PressableAnchor>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
