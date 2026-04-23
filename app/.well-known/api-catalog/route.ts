import { NextResponse } from "next/server";
import { getSiteUrlFromRequest } from "@config/index";

/**
 * API Catalog (RFC 9727)
 * Returns a linkset+json document advertising discoverable API endpoints.
 * https://www.rfc-editor.org/rfc/rfc9727
 */
export async function GET(request: Request) {
  const url = getSiteUrlFromRequest({ headers: request.headers });
  const catalog = {
    linkset: [
      {
        anchor: `${url}/.well-known/api-catalog`,
        item: [
          { href: `${url}/api/events` },
          { href: `${url}/api/news` },
          { href: `${url}/api/categories` },
          { href: `${url}/api/places` },
          { href: `${url}/api/regions` },
          { href: `${url}/api/cities` },
        ],
      },
      {
        anchor: `${url}/api/events`,
        "service-desc": [
          { href: `${url}/openapi.json`, type: "application/openapi+json" },
        ],
        "service-doc": [
          { href: `${url}/llms.txt`, type: "text/plain" },
        ],
      },
      {
        anchor: `${url}/api/news`,
        "service-desc": [
          { href: `${url}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${url}/api/categories`,
        "service-desc": [
          { href: `${url}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${url}/api/places`,
        "service-desc": [
          { href: `${url}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${url}/api/regions`,
        "service-desc": [
          { href: `${url}/openapi.json`, type: "application/openapi+json" },
        ],
      },
      {
        anchor: `${url}/api/cities`,
        "service-desc": [
          { href: `${url}/openapi.json`, type: "application/openapi+json" },
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
