import { NextResponse } from "next/server";
import { fetchPlaceBySlugExternal } from "@lib/api/places-external";
import { handleApiError } from "@utils/api-error-handler";

export function isSuspiciousPlaceSlug(rawSlug: string): boolean {
  const slug = rawSlug.trim().toLowerCase();
  if (slug.length === 0) return true;

  // Hard safety limits (avoid pathological upstream calls)
  if (slug.length > 80) return true;

  // Only allow canonical-ish slug characters for backend lookups
  if (!/^[a-z0-9-]+$/.test(slug)) return true;

  // Bots often try very long, hyphen-less concatenations.
  // Canonical multi-word places should be hyphenated.
  if (!slug.includes("-") && slug.length >= 18) return true;

  // Obvious placeholder-ish values
  if (slug.includes("undefined") || slug.includes("null")) return true;

  return false;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    // "catalunya" is a frontend-only SEO concept, not a real place in the backend
    // Return 404 early to avoid unnecessary API calls
    if (slug === "catalunya") {
      return NextResponse.json(null, { status: 404 });
    }

    // Avoid upstream calls for clearly botty/invalid slugs.
    // Pages can still recover via alias redirects using the cached places list.
    if (isSuspiciousPlaceSlug(slug)) {
      return NextResponse.json(null, { status: 404 });
    }

    const data = await fetchPlaceBySlugExternal(slug);
    if (!data) {
      // fetchPlaceBySlugExternal returns null only for 404
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    // fetchPlaceBySlugExternal throws for non-404 errors (500, network, etc.)
    return handleApiError(e, "/api/places/[slug]", {
      errorMessage: "Internal server error",
    });
  }
}

