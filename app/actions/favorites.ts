"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  FAVORITES_COOKIE_NAME,
  getFavoritesFromCookies,
  MAX_FAVORITES,
} from "@utils/favorites";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

async function persistFavoritesCookie(favorites: string[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    FAVORITES_COOKIE_NAME,
    JSON.stringify(favorites.slice(0, MAX_FAVORITES)),
    {
      path: "/",
      maxAge: MAX_AGE_SECONDS,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  );
}

export async function getFavorites(): Promise<string[]> {
  return await getFavoritesFromCookies();
}

export async function setFavoriteAction(
  eventSlug: string,
  shouldBeFavorite: boolean
): Promise<string[]> {
  const normalizedSlug = String(eventSlug || "").trim();
  if (!normalizedSlug) {
    return getFavorites();
  }

  const currentFavorites = await getFavoritesFromCookies();
  const nextSet = new Set(currentFavorites);

  if (shouldBeFavorite) {
    nextSet.add(normalizedSlug);
  } else {
    nextSet.delete(normalizedSlug);
  }

  const nextFavorites = Array.from(nextSet).slice(0, MAX_FAVORITES);
  await persistFavoritesCookie(nextFavorites);

  revalidatePath("/favorits");
  return nextFavorites;
}

export async function pruneFavoritesAction(
  slugsToRemove: string[]
): Promise<string[]> {
  const normalizedToRemove = (slugsToRemove || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (normalizedToRemove.length === 0) {
    return getFavorites();
  }

  const removeSet = new Set(normalizedToRemove);
  const currentFavorites = await getFavoritesFromCookies();
  const nextFavorites = currentFavorites.filter((slug) => !removeSet.has(slug));

  if (nextFavorites.length === currentFavorites.length) {
    return currentFavorites;
  }

  await persistFavoritesCookie(nextFavorites);
  revalidatePath("/favorits");
  return nextFavorites;
}
