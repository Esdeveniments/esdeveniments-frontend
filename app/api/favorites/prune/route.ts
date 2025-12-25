import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";

const PruneFavoritesSchema = z.object({
  slugsToRemove: z.array(z.string()).default([]),
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

    const normalizedToRemove = (parsed.data.slugsToRemove || [])
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (normalizedToRemove.length === 0) {
      return NextResponse.json(
        { ok: true, favorites: await getFavoritesFromCookies() },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const removeSet = new Set(normalizedToRemove);
    const currentFavorites = await getFavoritesFromCookies();
    const nextFavorites = currentFavorites.filter((slug) => !removeSet.has(slug));

    if (nextFavorites.length !== currentFavorites.length) {
      await persistFavoritesCookie(nextFavorites);
    }

    return NextResponse.json(
      { ok: true, favorites: nextFavorites },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
