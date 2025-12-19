import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { toLocalizedUrl, withLocalePath } from "@utils/i18n-seo";
import type { Metadata } from "next";
import type { AppLocale } from "types/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "App.PublishPage" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: toLocalizedUrl("/publica", locale),
    locale,
  });
}

const publishEventSchema = async (locale: AppLocale) => {
  const t = await getTranslations({ locale, namespace: "App.PublishPage" });
  const localizedPath = withLocalePath("/publica", locale);
  const localizedUrl = `${siteUrl}${localizedPath === "/" ? "" : localizedPath}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${localizedUrl}#webpage`,
    url: localizedUrl,
    name: t("schemaName"),
    description: t("schemaDescription"),
    inLanguage: locale,
    isPartOf: { "@id": `${siteUrl}#website` },
    mainEntity: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
    },
    potentialAction: {
      "@type": "CreateAction",
      target: localizedUrl,
      name: t("schemaAction"),
    },
  };
};

export default async function PublicaLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const schemaPromise = publishEventSchema(locale);
  return (
    <>
      <JsonLdServer
        id="publica-webpage-schema"
        data={schemaPromise as unknown as Record<string, unknown>}
      />
      {children}
    </>
  );
}
