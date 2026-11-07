import { escapeXml } from "./xml-escape";
import type { SitemapField, BuildSitemapOptions } from "types/sitemap";

// Google's hreflang spec wants one <url> per language version, each with the
// same alternates; listing only the default locale left /es/ and /en/ pages
// out of the sitemap (Bing: "important pages missing in sitemaps").
function expandLocaleVersions(field: SitemapField): SitemapField[] {
  if (!field.alternates) return [field];
  const locs = new Set([field.loc, ...Object.values(field.alternates)]);
  return [...locs].map((loc) => ({ ...field, loc }));
}

export function buildSitemap(
  fields: SitemapField[],
  options: BuildSitemapOptions = {}
): string {
  const { includeImage = false } = options;

  const namespaces = [];
  if (includeImage)
    namespaces.push(
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    );
  if (fields.some((field) => field.alternates)) {
    namespaces.push('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  }

  const namespaceString =
    namespaces.length > 0 ? ` ${namespaces.join(" ")}` : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaceString}>\n` +
    fields
      .flatMap(expandLocaleVersions)
      .map((field) => {
        let xml =
          `  <url>\n` +
          `    <loc>${escapeXml(field.loc)}</loc>\n` +
          (field.lastmod ? `    <lastmod>${field.lastmod}</lastmod>\n` : "");

        if (field.alternates) {
          xml += Object.entries(field.alternates)
            .map(
              ([hreflang, url]) =>
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(
                  hreflang
                )}" href="${escapeXml(url)}" />\n`
            )
            .join("");
        }

        if (includeImage && field.image) {
          xml +=
            `    <image:image>\n` +
            `      <image:loc>${escapeXml(field.image.loc)}</image:loc>\n` +
            `    </image:image>\n`;
        }

        xml += `  </url>`;
        return xml;
      })
      .join("\n") +
    `\n</urlset>`
  );
}

// URLs of the chunked child sitemaps: /<path>/1.xml … /<path>/<count>.xml
export function sitemapChunkUrls(
  siteUrl: string,
  path: "sitemap-events" | "sitemap-places",
  count: number,
): string[] {
  return Array.from({ length: count }, (_, i) => `${siteUrl}/${path}/${i + 1}.xml`);
}

// No <lastmod>: the children are built per request, so the only date we have
// is "now", which crawlers learn to ignore.
export function buildSitemapIndex(sitemapUrls: string[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapUrls
      .map(
        (url) =>
          `  <sitemap>\n` +
          `    <loc>${escapeXml(url)}</loc>\n` +
          `  </sitemap>`
      )
      .join("\n") +
    `\n</sitemapindex>`
  );
}
