import { cache } from "react";
import { cookies } from "next/headers";
import { MAX_FAVORITES } from "@utils/constants";

export const FAVORITES_COOKIE_NAME = "user_favorites";
export { MAX_FAVORITES };

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseFavoritesCookie(raw: string | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export const getFavoritesFromCookies = cache(async (): Promise<string[]> => {
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get(FAVORITES_COOKIE_NAME);
  return parseFavoritesCookie(currentCookie?.value);
});

export async function persistFavoritesCookie(
  favorites: string[]
): Promise<string[]> {
  const safe = favorites.slice(0, MAX_FAVORITES);
  const cookieStore = await cookies();

  if (safe.length === 0) {
    cookieStore.delete(FAVORITES_COOKIE_NAME);
    return safe;
  }

  cookieStore.set(FAVORITES_COOKIE_NAME, JSON.stringify(safe), {
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return safe;
}
