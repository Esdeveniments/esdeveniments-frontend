import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
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
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";
import SitemapContent from "@components/sitemap/SitemapContent";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

export const revalidate = 86400;

export async function generateMetadata() {
  const t = await getTranslations("App.Sitemap");
  const locale = resolveLocaleFromHeaders(await headers());
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/sitemap`,
    locale,
  });
}

async function getData(): Promise<{
  regions: RegionSummaryResponseDTO[];
  cities: CitySummaryResponseDTO[];
}> {
  const [regions, cities] = await Promise.all([fetchRegions(), fetchCities()]);

  return { regions, cities };
}

export default async function Page() {
  const tAppPromise = getTranslations("App.Sitemap");
  const tContentPromise = getTranslations("Components.SitemapContent");
  const dataPromise = getData();
  const pageMetaPromise = Promise.all([tAppPromise, tContentPromise]);

  // Generate structured data for the sitemap (localized)
  const data = await pageMetaPromise;
  const tApp = data[0];
  const tContent = data[1];
  const breadcrumbs = [
    { name: tApp("breadcrumbHome"), url: siteUrl },
    { name: tApp("breadcrumbCurrent"), url: `${siteUrl}/sitemap` },
  ];

  const webPageSchema = generateWebPageSchema({
    title: tApp("metaTitle"),
    description: tApp("metaDescription"),
    url: `${siteUrl}/sitemap`,
    breadcrumbs,
    mainContentOfPage: {
      "@type": "WebPageElement",
      "@id": `${siteUrl}/sitemap#maincontent`,
      name: tContent("title"),
      about: {
        "@type": "Thing",
        name: tContent("title"),
        description: tContent("description"),
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
            {tContent("footer")}
          </p>
        </footer>
      </SitemapLayout>
    </>
  );
}
