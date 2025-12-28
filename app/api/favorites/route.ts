import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";
import { MAX_FAVORITES } from "@utils/constants";

import {
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";

const ToggleFavoriteSchema = z.object({
  eventSlug: z
    .string()
    .trim()
    .min(1, { message: "Event slug cannot be empty" }),
  shouldBeFavorite: z.boolean(),
});

export async function GET() {
  try {
    const favorites = await getFavoritesFromCookies();
    return NextResponse.json(
      { ok: true, favorites },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "favorites", route: "/api/favorites", method: "GET" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch (error: unknown) {
      captureException(error, {
        tags: {
          feature: "favorites",
          route: "/api/favorites",
          method: "POST",
          phase: "parse_json",
        },
      });
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const parsed = ToggleFavoriteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { eventSlug, shouldBeFavorite } = parsed.data;
    const currentFavorites = await getFavoritesFromCookies();
    const nextSet = new Set(currentFavorites);

    if (shouldBeFavorite) {
      if (!nextSet.has(eventSlug) && nextSet.size >= MAX_FAVORITES) {
        return NextResponse.json(
          {
            ok: false,
            error: "MAX_FAVORITES_REACHED",
            maxFavorites: MAX_FAVORITES,
            analyticsEvent: "favorites_limit_reached",
            analyticsParams: {
              action: "add",
              max_favorites: MAX_FAVORITES,
            },
          },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      nextSet.delete(eventSlug);
      nextSet.add(eventSlug);
    } else {
      nextSet.delete(eventSlug);
    }

    const nextFavorites = Array.from(nextSet);
    const persistedFavorites = await persistFavoritesCookie(nextFavorites);

    return NextResponse.json(
      { ok: true, favorites: persistedFavorites },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "favorites", route: "/api/favorites", method: "POST" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
