import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MAX_FAVORITES,
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";

const ToggleFavoriteSchema = z.object({
  eventSlug: z.string().transform((value) => String(value || "").trim()),
  shouldBeFavorite: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => null)) as unknown;
    const parsed = ToggleFavoriteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { eventSlug, shouldBeFavorite } = parsed.data;
    if (!eventSlug) {
      return NextResponse.json(
        { ok: true, favorites: await getFavoritesFromCookies() },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const currentFavorites = await getFavoritesFromCookies();
    const nextSet = new Set(currentFavorites);

    if (shouldBeFavorite) {
      if (!nextSet.has(eventSlug) && nextSet.size >= MAX_FAVORITES) {
        const oldest = nextSet.values().next().value;
        if (typeof oldest === "string") {
          nextSet.delete(oldest);
        }
      }
      nextSet.add(eventSlug);
    } else {
      nextSet.delete(eventSlug);
    }

    const nextFavorites = Array.from(nextSet).slice(0, MAX_FAVORITES);
    await persistFavoritesCookie(nextFavorites);

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
