import { NextResponse } from "next/server";
import { siteUrl } from "@config/index";

/**
 * API Catalog (RFC 9727)
 * Returns a linkset+json document advertising discoverable API endpoints.
 * https://www.rfc-editor.org/rfc/rfc9727
 */
export async function GET() {
  const catalog = {
    linkset: [
      {
        anchor: `${siteUrl}/.well-known/api-catalog`,
        item: [
          { href: `${siteUrl}/api/events` },
          { href: `${siteUrl}/api/news` },
          { href: `${siteUrl}/api/categories` },
          { href: `${siteUrl}/api/places` },
          { href: `${siteUrl}/api/regions` },
          { href: `${siteUrl}/api/cities` },
        ],
      },
      {
        anchor: `${siteUrl}/api/events`,
        "service-desc": [
          { href: `${siteUrl}/openapi.json`, type: "application/openapi+json" },
        ],
        "service-doc": [
          { href: `${siteUrl}/llms.txt`, type: "text/plain" },
        ],
      },
      {
        anchor: `${siteUrl}/api/news`,
        "service-desc": [
          { href: `${siteUrl}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${siteUrl}/api/categories`,
        "service-desc": [
          { href: `${siteUrl}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${siteUrl}/api/places`,
        "service-desc": [
          { href: `${siteUrl}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${siteUrl}/api/regions`,
        "service-desc": [
          { href: `${siteUrl}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${siteUrl}/api/cities`,
        "service-desc": [
          { href: `${siteUrl}/openapi.json`, type: "application/openapi+json" },
        ],
      },
    ],
  };

  return NextResponse.json(catalog, {
    status: 200,
    headers: {
      "Content-Type":
        'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
    },
  });
}
