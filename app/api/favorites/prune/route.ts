import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";

import {
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";
import { getValidAccessToken } from "@utils/auth-cookies";
import { removeFavoriteEventExternal } from "@lib/api/favorites-external";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const PruneFavoritesSchema = z.object({
  slugsToRemove: z.array(z.string().trim()).default([]),
  eventIdsToRemove: z.array(z.string().trim()).default([]),
});

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch (error: unknown) {
      captureException(error, {
        tags: {
          feature: "favorites",
          route: "/api/favorites/prune",
          phase: "parse_json",
        },
      });
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: NO_STORE }
      );
    }
    const parsed = PruneFavoritesSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: NO_STORE }
      );
    }

    const authToken = await getValidAccessToken();

    // Authed: backend is the source of truth, keyed by event id, not slug.
    // Cookie pruning doesn't apply here.
    if (authToken) {
      const idsToRemove = parsed.data.eventIdsToRemove.filter(Boolean);
      if (idsToRemove.length === 0) {
        return NextResponse.json({ ok: true }, { headers: NO_STORE });
      }

      const results = await Promise.allSettled(
        idsToRemove.map((id) => removeFavoriteEventExternal(authToken, id))
      );

      const realFailures = results
        .map((result, index) => ({ result, id: idsToRemove[index] }))
        .filter(({ result }) => {
          if (result.status === "rejected") return true;
          // A 404 means the favorite is already gone (double-prune race,
          // another tab, a retry) — that's the outcome we wanted, not a
          // failure. Anything else (5xx, network failure/status 0) is a
          // real backend problem worth surfacing.
          return !result.value.ok && result.value.status !== 404;
        });

      if (realFailures.length > 0) {
        captureException(new Error("Favorites: prune failures"), {
          tags: {
            feature: "favorites",
            route: "/api/favorites/prune",
            phase: "remove_favorite_event_external",
          },
          extra: {
            failedCount: realFailures.length,
            failedIds: realFailures.map((f) => f.id),
          },
        });
      }

      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }

    // Guest branch: cookie store, keyed by slug.
    const normalizedToRemove = parsed.data.slugsToRemove.filter(Boolean);
    const currentFavorites = await getFavoritesFromCookies();

    if (normalizedToRemove.length === 0) {
      return NextResponse.json(
        { ok: true, favorites: currentFavorites },
        { headers: NO_STORE }
      );
    }

    const removeSet = new Set(normalizedToRemove);
    const nextFavorites = currentFavorites.filter(
      (slug) => !removeSet.has(slug)
    );

    const responseFavorites =
      nextFavorites.length !== currentFavorites.length
        ? await persistFavoritesCookie(nextFavorites)
        : nextFavorites;

    return NextResponse.json(
      { ok: true, favorites: responseFavorites },
      { headers: NO_STORE }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "favorites", route: "/api/favorites/prune" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: NO_STORE }
    );
  }
}
