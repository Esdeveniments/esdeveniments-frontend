import type { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Link } from "@i18n/routing";
import {
  contactEmail,
  githubRepoUrl,
  siteUrl,
  socialLinks,
} from "@config/index";
import { buildPageMeta } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  DocsCodeBlock,
  DocsLink,
} from "@components/ui/developers/DocsPrimitives";
import { toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";

const QUICKSTART = [
  "# Today's events in Barcelona",
  `curl "${siteUrl}/api/events?place=barcelona&byDate=avui"`,
  "",
  "# Search events by keyword",
  `curl "${siteUrl}/api/events?term=jazz&size=10"`,
  "",
  "# One event",
  `curl "${siteUrl}/api/events/{slug}"`,
].join("\n");

// Browser-only endpoint (Origin check), so the example is a same-origin fetch.
const IDEMPOTENT_WRITE = [
  `await fetch("/api/sponsors/checkout", {`,
  `  method: "POST",`,
  `  headers: {`,
  `    "Content-Type": "application/json",`,
  `    "Idempotency-Key": crypto.randomUUID(), // reuse it on retries`,
  `  },`,
  `  body: JSON.stringify({ duration: "7days", geoScope: "town", place: "barcelona", placeName: "Barcelona" }),`,
  `});`,
].join("\n");

const SANDBOX_LINKS = [
  { key: "sandboxToday", href: "/api/events?place=barcelona&byDate=avui&size=5" },
  { key: "sandboxSearch", href: "/api/events?term=jazz&size=5" },
  { key: "sandboxCategories", href: "/api/categories" },
] as const;

const DOC_LINKS = [
  { key: "docsOpenapi", href: "/openapi.json" },
  { key: "docsLlms", href: "/llms.txt" },
  { key: "docsApiLlms", href: "/api/llms.txt" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Developers" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: toLocalizedUrl("/developers", locale),
    locale,
  });
}

const DevelopersPage: NextPage = async () => {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Developers" });
  const pageUrl = toLocalizedUrl("/developers", locale);

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    name: t("metaTitle"),
    url: pageUrl,
    description: t("metaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
    mainEntity: {
      "@type": "WebAPI",
      name: "Esdeveniments.cat API",
      description: t("intro"),
      documentation: `${siteUrl}/openapi.json`,
      termsOfService: `${siteUrl}/termes-servei`,
      provider: { "@id": `${siteUrl}#organization` },
      isAccessibleForFree: true,
    },
  };

  return (
    <>
      <JsonLdServer id="developers-page-schema" data={schema} />
      <div className="container py-section-y">
        <div className="stack gap-8 max-w-3xl mx-auto">
          <div className="stack gap-2">
            <h1 className="heading-1">{t("heading")}</h1>
            <p className="body-large text-foreground/80">{t("intro")}</p>
          </div>

          <section className="stack gap-2">
            <h2 className="heading-3">{t("keysTitle")}</h2>
            <p className="body-normal text-foreground/80">{t("keysBody")}</p>
          </section>

          <section className="stack gap-3">
            <h2 className="heading-3">{t("quickstartTitle")}</h2>
            <p className="body-normal text-foreground/80">
              {t("quickstartBody")}
            </p>
            <DocsCodeBlock code={QUICKSTART} />
          </section>

          <section className="stack gap-2">
            <h2 className="heading-3">{t("docsTitle")}</h2>
            <ul className="stack gap-1 body-normal list-disc pl-5">
              {DOC_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <DocsLink href={href}>{t(key)}</DocsLink>
                </li>
              ))}
            </ul>
          </section>

          <section className="stack gap-2">
            <h2 className="heading-3">{t("sandboxTitle")}</h2>
            <p className="body-normal text-foreground/80">{t("sandboxBody")}</p>
            <ul className="stack gap-1 body-normal list-disc pl-5">
              {SANDBOX_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <DocsLink href={href}>{t(key)}</DocsLink>
                </li>
              ))}
            </ul>
          </section>

          <section className="stack gap-3">
            <h2 className="heading-3">{t("agentsTitle")}</h2>
            <p className="body-normal text-foreground/80">{t("agentsBody")}</p>
            <Link
              href="/developers/mcp"
              prefetch={false}
              className="btn-primary w-fit transition-interactive"
            >
              {t("agentsMcpLink")}
            </Link>
          </section>

          <section className="stack gap-3">
            <h2 className="heading-3">{t("writesTitle")}</h2>
            <p className="body-normal text-foreground/80">{t("writesBody")}</p>
            <DocsCodeBlock code={IDEMPOTENT_WRITE} />
          </section>

          <section className="stack gap-2">
            <h2 className="heading-3">{t("githubTitle")}</h2>
            <p className="body-normal text-foreground/80">{t("githubBody")}</p>
            <ul className="stack gap-1 body-normal list-disc pl-5">
              <li>
                <DocsLink href={socialLinks.github}>{t("githubLink")}</DocsLink>
              </li>
              <li>
                <DocsLink href={githubRepoUrl}>{t("githubRepoLink")}</DocsLink>
              </li>
              <li>
                <DocsLink href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </DocsLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
};

export default DevelopersPage;
