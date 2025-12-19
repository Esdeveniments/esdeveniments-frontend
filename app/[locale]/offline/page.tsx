import { Suspense, type JSX } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { toLocalizedUrl, withLocalePath } from "@utils/i18n-seo";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { AppLocale } from "types/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.Offline" });
  const description = t("schemaDescription");

  return {
    ...(buildPageMeta({
      title: t("title"),
      description,
      canonical: toLocalizedUrl("/offline", locale),
      locale,
    }) as Metadata),
    robots: "noindex, nofollow",
  };
}

export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<JSX.Element> {
  return (
    <Suspense fallback={null}>
      <OfflinePageInner params={params} />
    </Suspense>
  );
}

async function OfflinePageInner({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<JSX.Element> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.Offline" });
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocalePath(path, locale)}`;
  const offlineSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${absolute("/offline")}#webpage`,
    url: absolute("/offline"),
    name: t("schemaName"),
    description: t("schemaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
  };
  return (
    <>
      <JsonLdServer id="offline-webpage-schema" data={offlineSchema} />
      <div
        className="min-h-screen flex items-center justify-center bg-muted"
        data-testid="offline-page"
      >
        <div className="text-center">
          <h1
            className="text-4xl font-bold text-foreground-strong mb-4"
            data-testid="offline-title"
          >
            {t("heading")}
          </h1>
          <p className="text-lg text-foreground/80 mb-8">{t("description")}</p>
          <PressableAnchor
            href={withLocalePath("/", locale)}
            className="btn-primary"
            data-testid="offline-home-link"
            variant="inline"
          >
            {t("homeLink")}
          </PressableAnchor>
          <br />
          <PressableAnchor
            href={withLocalePath("/barcelona", locale)}
            className="btn-neutral mt-4 mr-2"
            variant="inline"
          >
            {t("barcelona")}
          </PressableAnchor>
          <PressableAnchor
            href={withLocalePath("/catalunya", locale)}
            className="btn-neutral mt-4"
            variant="inline"
          >
            {t("catalunya")}
          </PressableAnchor>
        </div>
      </div>
    </>
  );
}
