import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";

import {
  MAX_FAVORITES,
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

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => null)) as unknown;
    const parsed = ToggleFavoriteSchema.safeParse(json);
    if (!parsed.success) {
      const hasEmptySlugIssue = parsed.error.issues.some(
        (issue) =>
          issue.path.length === 1 &&
          issue.path[0] === "eventSlug" &&
          issue.code === "too_small" &&
          issue.type === "string" &&
          issue.minimum === 1
      );

      if (hasEmptySlugIssue) {
        return NextResponse.json(
          { ok: false, error: "EMPTY_EVENT_SLUG" },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

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
        const oldest = nextSet.values().next().value;
        if (typeof oldest === "string") {
          nextSet.delete(oldest);
        }
      }
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
      tags: { feature: "favorites", route: "/api/favorites" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
