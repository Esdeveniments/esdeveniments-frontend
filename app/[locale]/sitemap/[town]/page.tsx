import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { siteUrl } from "@config/index";
import { getAllYears, normalizeMonthParam } from "@lib/dates";
import {
  MONTHS_URL as DEFAULT_MONTHS_URL,
  getMonthNames,
} from "@utils/constants";
// No headers/nonce needed with relaxed CSP
import JsonLdServer from "@components/partials/JsonLdServer";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "types/i18n";
import { formatPlacePhrases } from "@utils/string-helpers";
import { getPlaceTypeAndLabelCached } from "@utils/location-helpers";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import {
  toLocalizedUrl,
  withLocalePath,
} from "@utils/i18n-seo";
import { locale as rootLocale } from "next/root-params";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import SitemapHeader from "@components/sitemap/SitemapHeader";
import SitemapHeaderSkeleton from "@components/sitemap/SitemapHeaderSkeleton";
import SitemapSkeleton from "@components/sitemap/SitemapSkeleton";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sitemap/[town]">) {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Pages.SitemapTown" });
  const { town } = await params;
  // Never throws: a backend error falls back to a label built from the slug,
  // so the archive renders instead of 500ing (~698 GSC 5xx on /sitemap/<town>).
  const { type, label } = await getPlaceTypeAndLabelCached(town);
  const { placeIn, placeOf } = formatPlacePhrases(label, type, locale);

  return buildPageMeta({
    title: t("metaTitle", { placeIn }),
    description: t("metaDescription", { placeIn, placeOf }),
    canonical: `${siteUrl}/sitemap/${town}`,
    locale,
  });
}

export default function Page({
  params,
}: PageProps<"/[locale]/sitemap/[town]">) {
  return (
    <Suspense
      fallback={
        <SitemapLayout>
          <SitemapSkeleton />
        </SitemapLayout>
      }
    >
      <AsyncPage params={params} />
    </Suspense>
  );
}

// The year list reads the clock, which a prerender may only do inside
// "use cache". It changes once a year, so a day-long entry is plenty.
async function getSitemapYears(): Promise<number[]> {
  "use cache";
  cacheLife("days");
  return getAllYears();
}

async function AsyncPage({ params }: Pick<PageProps<"/[locale]/sitemap/[town]">, "params">) {
  const { town } = await params;
  const locale: AppLocale = (await rootLocale()) as AppLocale;
  const years = await getSitemapYears();
  const t = await getTranslations({ locale, namespace: "Pages.SitemapTown" });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const monthLabels = getMonthNames(locale);
  const months = DEFAULT_MONTHS_URL.map((slug, index) => {
    const fallback = normalizeMonthParam(slug);
    return {
      slug,
      label: monthLabels[index] || fallback.label,
    };
  });

  const placePromise = getPlaceTypeAndLabelCached(town);
  const { type, label: townLabel } = await placePromise;
  const { placeIn, placeOf } = formatPlacePhrases(townLabel, type, locale);

  const breadcrumbs = [
    { name: t("breadcrumbs.home"), url: toLocalizedUrl("/", locale) },
    { name: t("breadcrumbs.archive"), url: toLocalizedUrl("/sitemap", locale) },
    { name: townLabel, url: toLocalizedUrl(`/sitemap/${town}`, locale) },
  ];

  const collectionPageSchema = generateCollectionPageSchema({
    title: t("collectionTitle", { placeOf }),
    description: t("collectionDescription", { placeIn }),
    url: toLocalizedUrl(`/sitemap/${town}`, locale),
    breadcrumbs,
    locale,
    numberOfItems: years.length * months.length,
    mainEntity: {
      "@type": "ItemList",
      "@id": `${toLocalizedUrl(`/sitemap/${town}`, locale)}#archivelist`,
      name: t("mainEntityName", { placeOf }),
      description: t("mainEntityDescription", { placeIn }),
      numberOfItems: years.length * months.length,
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
          <SitemapHeader placePromise={placePromise} />
        </Suspense>

        <section className="grid overflow-hidden grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4 grid-flow-row w-full">
          {years?.map((year) => (
            <article key={year} className="stack gap-4">
              <h2 className="heading-3">{year}</h2>
              <nav role="list" className="stack gap-1">
                {[...months].reverse().map(({ slug, label }) => {
                  return (
                    <div key={`${year}-${slug}`} role="listitem">
                      <PressableAnchor
                        href={withLocale(`/sitemap/${town}/${year}/${slug}`)}
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
                {t("aboutBody", { placeIn })}
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
