import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App.Offline");
  const description = t("schemaDescription");
  const locale = resolveLocaleFromHeaders(await headers());

  return {
    ...(buildPageMeta({
      title: t("title"),
      description,
      canonical: `${siteUrl}/offline`,
      locale,
    }) as Metadata),
    robots: "noindex, nofollow",
  };
}

export default async function OfflinePage() {
  const t = await getTranslations("App.Offline");
  const headersList = await headers();
  const locale = (resolveLocaleFromHeaders(headersList) ||
    DEFAULT_LOCALE) as AppLocale;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocale(path)}`;
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
            href={withLocale("/")}
            className="btn-primary"
            data-testid="offline-home-link"
            variant="inline"
          >
            {t("homeLink")}
          </PressableAnchor>
          <br />
          <PressableAnchor
            href={withLocale("/barcelona")}
            className="btn-neutral mt-4 mr-2"
            variant="inline"
          >
            {t("barcelona")}
          </PressableAnchor>
          <PressableAnchor
            href={withLocale("/catalunya")}
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
