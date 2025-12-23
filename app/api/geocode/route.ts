import { NextResponse } from "next/server";
import { createKeyedCache } from "@lib/api/cache";
import type { GeocodeResponseDTO } from "types/api/geocode";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const geocodeCache = createKeyedCache<GeocodeResponseDTO | null>(ONE_DAY_MS);

function buildQuery(requestUrl: URL): string | null {
  const raw = requestUrl.searchParams.get("q");
  if (!raw) return null;

  const normalized = raw.replace(/\s+/g, " ").trim();
  if (normalized.length < 3) return null;

  // Keep the query reasonably bounded to avoid abuse.
  if (normalized.length > 200) return normalized.slice(0, 200);
  return normalized;
}

async function geocodeViaNominatim(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  // Improve precision and reduce ambiguity for our Catalunya-focused app.
  url.searchParams.set("countrycodes", "es");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      // Nominatim requires a user agent identifying the application.
      "User-Agent": "que-fer (events map geocoder)",
    },
    // Cache in our own TTL cache; don't rely on edge caches here.
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first: unknown = data[0];
  if (!first || typeof first !== "object") return null;

  const record = first as Record<string, unknown>;
  const latRaw = record.lat;
  const lonRaw = record.lon;

  const lat = typeof latRaw === "string" ? Number(latRaw) : null;
  const lon = typeof lonRaw === "string" ? Number(lonRaw) : null;

  if (
    lat === null ||
    lon === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }

  const displayNameRaw = record.display_name;
  const displayName =
    typeof displayNameRaw === "string" ? displayNameRaw : undefined;

  const response: GeocodeResponseDTO = { lat, lon, displayName };
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const query = buildQuery(requestUrl);
  if (!query) {
    return NextResponse.json(null, { status: 200 });
  }

  const result = await geocodeCache.cache(query, async (q) => {
    try {
      return await geocodeViaNominatim(String(q));
    } catch {
      return null;
    }
  });

  return NextResponse.json(result, {
    status: 200,
    headers: {
      // Coordinates are stable; allow aggressive caching at browser + CDN.
      // Align cache semantics with our in-memory TTL (24h) and tolerate upstream outages.
      "Cache-Control":
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800",
    },
  });
}
