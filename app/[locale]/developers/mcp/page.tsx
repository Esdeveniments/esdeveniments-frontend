import type { Metadata, NextPage } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Link } from "@i18n/routing";
import { siteUrl } from "@config/index";
import { MCP_TOOLS } from "@config/mcp-tools";
import { buildPageMeta } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  DocsCodeBlock,
  DocsLink,
} from "@components/ui/developers/DocsPrimitives";
import { toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";

const MCP_URL = `${siteUrl}/mcp`;

const CLIENT_CONFIG = JSON.stringify(
  { mcpServers: { "esdeveniments-cat": { type: "http", url: MCP_URL } } },
  null,
  2,
);

const DISCOVERY_LINKS = [
  "/.well-known/mcp/server-card.json",
  "/.well-known/agent-skills/index.json",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.DevelopersMcp" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: toLocalizedUrl("/developers/mcp", locale),
    locale,
  });
}

const DevelopersMcpPage: NextPage = async () => {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.DevelopersMcp" });
  const pageUrl = toLocalizedUrl("/developers/mcp", locale);

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    name: t("heading"),
    url: pageUrl,
    description: t("metaDescription"),
    isPartOf: { "@id": `${siteUrl}#website` },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Esdeveniments.cat MCP server",
      applicationCategory: "DeveloperApplication",
      url: MCP_URL,
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" },
      provider: { "@id": `${siteUrl}#organization` },
    },
  };

  return (
    <>
      <JsonLdServer id="developers-mcp-page-schema" data={schema} />
      <div className="container py-section-y">
        <div className="stack gap-8 max-w-3xl mx-auto">
          <div className="stack gap-2">
            <h1 className="heading-1">{t("heading")}</h1>
            <p className="body-large text-foreground/80">{t("intro")}</p>
          </div>

          <section className="stack gap-3">
            <h2 className="heading-3">{t("endpointTitle")}</h2>
            <p className="body-normal text-foreground/80">
              {t("endpointBody")}
            </p>
            <DocsCodeBlock code={CLIENT_CONFIG} />
          </section>

          <section className="stack gap-3">
            <h2 className="heading-3">{t("toolsTitle")}</h2>
            <dl className="stack gap-3">
              {MCP_TOOLS.map((tool) => (
                <div key={tool.name} className="stack gap-1">
                  <dt className="body-normal font-semibold font-mono">
                    {tool.name}
                  </dt>
                  <dd className="body-normal text-foreground/80">
                    {tool.description}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="stack gap-2">
            <h2 className="heading-3">{t("webmcpTitle")}</h2>
            <p className="body-normal text-foreground/80">{t("webmcpBody")}</p>
          </section>

          <section className="stack gap-2">
            <h2 className="heading-3">{t("discoveryTitle")}</h2>
            <p className="body-normal text-foreground/80">
              {t("discoveryBody")}
            </p>
            <ul className="stack gap-1 body-normal list-disc pl-5">
              {DISCOVERY_LINKS.map((href) => (
                <li key={href}>
                  <DocsLink href={href}>{`${siteUrl}${href}`}</DocsLink>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/developers"
            prefetch={false}
            className="btn-primary w-fit transition-interactive"
          >
            {t("backLink")}
          </Link>
        </div>
      </div>
    </>
  );
};

export default DevelopersMcpPage;
