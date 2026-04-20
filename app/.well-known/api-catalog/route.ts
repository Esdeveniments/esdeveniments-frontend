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
        anchor: `${siteUrl}/api/events`,
        "service-desc": [
          { href: `${siteUrl}/llms.txt`, type: "text/plain" },
        ],
        "service-doc": [{ href: `${siteUrl}/llms.txt`, type: "text/plain" }],
      },
      {
        anchor: `${siteUrl}/api/categories`,
        "service-desc": [
          { href: `${siteUrl}/llms.txt`, type: "text/plain" },
        ],
      },
      {
        anchor: `${siteUrl}/api/places`,
        "service-desc": [
          { href: `${siteUrl}/llms.txt`, type: "text/plain" },
        ],
      },
      {
        anchor: `${siteUrl}/api/news`,
        "service-desc": [
          { href: `${siteUrl}/llms.txt`, type: "text/plain" },
        ],
      },
    ],
  };

  return NextResponse.json(catalog, {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
    },
  });
}
