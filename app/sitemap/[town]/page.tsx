import { Suspense } from "react";
import { siteUrl } from "@config/index";
import { getAllYears, normalizeMonthParam } from "@lib/dates";
import { MONTHS_URL as DEFAULT_MONTHS_URL } from "@utils/constants";
// No headers/nonce needed with relaxed CSP
import JsonLdServer from "@components/partials/JsonLdServer";
import { getPlaceBySlug } from "@lib/api/places";
import { getTranslations } from "next-intl/server";
import type { TownStaticPathParams } from "types/common";
import type { AppLocale } from "types/i18n";
import { formatCatalanA } from "@utils/helpers";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import {
  getLocaleSafely,
  toLocalizedUrl,
  withLocalePath,
} from "@utils/i18n-seo";
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
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Pages.SitemapTown" });
  const { town } = await params;
  const place = await getPlaceBySlug(town);
  const label = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatCatalanA(label, placeType, false);

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

async function AsyncPage({ params }: { params: Promise<TownStaticPathParams> }) {
  const { town } = await params;
  const years: number[] = getAllYears();
  const locale: AppLocale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Pages.SitemapTown" });
  const tConstants = await getTranslations({
    locale,
    namespace: "Components.Constants",
  });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const monthLabels = (tConstants.raw("months") as string[]) || [];
  const monthSlugs =
    (tConstants.raw("monthsUrl") as string[]) || DEFAULT_MONTHS_URL;
  const months = monthSlugs.map((slug, index) => {
    const fallback = normalizeMonthParam(slug);
    return {
      slug,
      label: monthLabels[index] || fallback.label,
    };
  });

  // Start fetch
  const placePromise = getPlaceBySlug(town);
  const place = await placePromise;
  const townLabel = place?.name || town;

  const breadcrumbs = [
    { name: t("breadcrumbs.home"), url: toLocalizedUrl("/", locale) },
    { name: t("breadcrumbs.archive"), url: toLocalizedUrl("/sitemap", locale) },
    { name: townLabel, url: toLocalizedUrl(`/sitemap/${town}`, locale) },
  ];

  const collectionPageSchema = generateCollectionPageSchema({
    title: t("collectionTitle", { town: townLabel }),
    description: t("collectionDescription", { town: townLabel }),
    url: toLocalizedUrl(`/sitemap/${town}`, locale),
    breadcrumbs,
    numberOfItems: years.length * months.length,
    mainEntity: {
      "@type": "ItemList",
      "@id": `${toLocalizedUrl(`/sitemap/${town}`, locale)}#archivelist`,
      name: t("mainEntityName", { town: townLabel }),
      description: t("mainEntityDescription", { town: townLabel }),
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
          <SitemapHeader town={town} placePromise={placePromise} />
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
