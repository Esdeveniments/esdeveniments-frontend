import { cookies } from "next/headers";

export const FAVORITES_COOKIE_NAME = "user_favorites";
export const MAX_FAVORITES = 50;

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

export async function getFavoritesFromCookies(): Promise<string[]> {
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get(FAVORITES_COOKIE_NAME);
  return parseFavoritesCookie(currentCookie?.value);
}
