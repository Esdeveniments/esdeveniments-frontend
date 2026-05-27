import { NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { MAX_FAVORITES } from "@utils/constants";
import {
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { fetchEventBySlugWithStatus } from "@lib/api/events";
import { addFavoriteEventExternal } from "@lib/api/favorites-external";
import type { FavoriteMigrationSlugResult } from "types/api/favorites";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const RESOLVE_CONCURRENCY = 5;

/**
 * POST /api/favorites/migrate
 *
 * Called once after login to move any guest-cookie favorites into the user's
 * server-side favorites. Idempotent and best-effort:
 *   - 401 if no auth cookie present.
 *   - Short-circuits with `{ migrated: 0 }` when the cookie is empty.
 *   - Per-slug failures are logged and skipped; the cookie is cleared after
 *     attempting every entry so we don't migrate the same slugs twice.
 */
export async function POST() {
  try {
    const authToken = await getAccessTokenFromCookies();
    if (!authToken) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401, headers: NO_STORE }
      );
    }

    const slugs = await getFavoritesFromCookies();
    if (slugs.length === 0) {
      return NextResponse.json(
        { ok: true, migrated: 0, failed: 0 },
        { headers: NO_STORE }
      );
    }

    const unique = Array.from(new Set(slugs)).slice(0, MAX_FAVORITES);
    let migrated = 0;
    let dropped = 0;
    const failedSlugs: string[] = [];

    for (let i = 0; i < unique.length; i += RESOLVE_CONCURRENCY) {
      const chunk = unique.slice(i, i + RESOLVE_CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map(async (slug): Promise<FavoriteMigrationSlugResult> => {
          const { event, notFound } = await fetchEventBySlugWithStatus(slug);
          // Permanent 404 from the backend — the event no longer exists.
          // Treat as "successfully dropped" so it won't be retried; it would
          // fail forever on the same dead slug.
          if (notFound) return { kind: "dropped", slug };
          if (!event?.id) return { kind: "failed", slug };
          const result = await addFavoriteEventExternal(authToken, event.id);
          if (result.ok) return { kind: "migrated", slug };
          // 409 = server-side favorites limit reached. Permanent, not
          // transient — drop it so it isn't retried on every future login.
          if (result.status === 409) return { kind: "dropped", slug };
          return { kind: "failed", slug };
        })
      );

      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status !== "fulfilled") {
          // Rejected promise → the originating slug is a transient failure.
          failedSlugs.push(chunk[j]);
          continue;
        }
        if (s.value.kind === "migrated") migrated += 1;
        else if (s.value.kind === "dropped") dropped += 1;
        else failedSlugs.push(s.value.slug);
      }
    }

    // Rewrite the cookie to hold only the transiently-failed slugs: migrated
    // and dropped entries must not be retried next login (redundant API
    // calls / re-adds), while failures are preserved for a future attempt.
    // Empty → cookie deleted by persistFavoritesCookie.
    await persistFavoritesCookie(failedSlugs);

    return NextResponse.json(
      { ok: true, migrated, dropped, failed: failedSlugs.length },
      { headers: NO_STORE }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: {
        feature: "favorites",
        route: "/api/favorites/migrate",
        method: "POST",
      },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: NO_STORE }
    );
  }
}
