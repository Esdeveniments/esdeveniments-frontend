import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";

import {
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";

const PruneFavoritesSchema = z.object({
  slugsToRemove: z.array(z.string().trim()).default([]),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => null)) as unknown;
    const parsed = PruneFavoritesSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const normalizedToRemove = parsed.data.slugsToRemove.filter(Boolean);
    const currentFavorites = await getFavoritesFromCookies();

    if (normalizedToRemove.length === 0) {
      return NextResponse.json(
        { ok: true, favorites: currentFavorites },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const removeSet = new Set(normalizedToRemove);
    const nextFavorites = currentFavorites.filter(
      (slug) => !removeSet.has(slug)
    );

    if (nextFavorites.length !== currentFavorites.length) {
      await persistFavoritesCookie(nextFavorites);
    }

    return NextResponse.json(
      { ok: true, favorites: nextFavorites },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "favorites", route: "/api/favorites/prune" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
