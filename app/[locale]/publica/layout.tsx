import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.PublishPage" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/publica`,
    locale,
  });
}

const publishEventSchema = async () => {
  const locale = await getLocaleSafely();
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

export default function PublicaLayout({ children }: { children: ReactNode }) {
  const schemaPromise = publishEventSchema();
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
