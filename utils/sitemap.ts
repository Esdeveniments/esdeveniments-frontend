import { escapeXml } from "./xml-escape";
import type { SitemapField, BuildSitemapOptions } from "types/sitemap";

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

  const namespaceString =
    namespaces.length > 0 ? ` ${namespaces.join(" ")}` : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaceString}>\n` +
    fields
      .map((field) => {
        let xml =
          `  <url>\n` +
          `    <loc>${escapeXml(field.loc)}</loc>\n` +
          `    <lastmod>${field.lastmod}</lastmod>\n` +
          `    <changefreq>${field.changefreq}</changefreq>\n` +
          `    <priority>${field.priority}</priority>\n`;

        if (includeImage && field.image) {
          xml +=
            `    <image:image>\n` +
            `      <image:loc>${escapeXml(field.image.loc)}</image:loc>\n` +
            `      <image:title>${escapeXml(
              field.image.title
            )}</image:title>\n` +
            `    </image:image>\n`;
        }

        xml += `  </url>`;
        return xml;
      })
      .join("\n") +
    `\n</urlset>`
  );
}

export function buildSitemapIndex(sitemapUrls: string[]): string {
  const lastmod = new Date().toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapUrls
      .map(
        (url) =>
          `  <sitemap>\n` +
          `    <loc>${escapeXml(url)}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `  </sitemap>`
      )
      .join("\n") +
    `\n</sitemapindex>`
  );
}
