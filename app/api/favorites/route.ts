import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  FAVORITES_COOKIE_NAME,
  MAX_FAVORITES,
  parseFavoritesCookie,
} from "@utils/favorites";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const ToggleFavoriteSchema = z.object({
  eventSlug: z.string().transform((value) => String(value || "").trim()),
  shouldBeFavorite: z.boolean(),
});

async function persistFavoritesCookie(favorites: string[]): Promise<void> {
  const safe = favorites.slice(0, MAX_FAVORITES);
  const cookieStore = await cookies();
  cookieStore.set(FAVORITES_COOKIE_NAME, JSON.stringify(safe), {
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

async function getFavoritesFromRequestCookies(): Promise<string[]> {
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get(FAVORITES_COOKIE_NAME);
  return parseFavoritesCookie(currentCookie?.value);
}

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
        { ok: true, favorites: await getFavoritesFromRequestCookies() },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const currentFavorites = await getFavoritesFromRequestCookies();
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
