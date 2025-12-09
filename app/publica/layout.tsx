import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";

export const metadata = (async () => {
  const t = await getTranslations("App.PublishPage");
  const locale = resolveLocaleFromHeaders(await headers());
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/publica`,
    locale,
  });
})();

const publishEventSchema = async () => {
  const t = await getTranslations("App.PublishPage");
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/publica#webpage`,
    url: `${siteUrl}/publica`,
    name: t("schemaName"),
    description: t("schemaDescription"),
    inLanguage: "ca",
    isPartOf: { "@id": `${siteUrl}#website` },
    mainEntity: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
    },
    potentialAction: {
      "@type": "CreateAction",
      target: `${siteUrl}/publica`,
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
