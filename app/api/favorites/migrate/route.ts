import { NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { cookies } from "next/headers";
import { MAX_FAVORITES } from "@utils/constants";
import {
  FAVORITES_COOKIE_NAME,
  getFavoritesFromCookies,
} from "@utils/favorites";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { fetchEventBySlugWithStatus } from "@lib/api/events";
import { addFavoriteEventExternal } from "@lib/api/favorites-external";

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
    let failed = 0;

    type SlugResult =
      | { kind: "migrated"; slug: string }
      | { kind: "dropped"; slug: string } // permanently gone — safe to drop
      | { kind: "failed"; slug: string }; // transient — retry next login

    for (let i = 0; i < unique.length; i += RESOLVE_CONCURRENCY) {
      const chunk = unique.slice(i, i + RESOLVE_CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map(async (slug): Promise<SlugResult> => {
          const { event, notFound } = await fetchEventBySlugWithStatus(slug);
          // Permanent 404 from the backend — the event no longer exists.
          // Treat as "successfully dropped" so it won't block clearing the
          // cookie. If we kept it, every subsequent login would retry and
          // fail forever on the same dead slug.
          if (notFound) return { kind: "dropped", slug };
          if (!event?.id) return { kind: "failed", slug };
          const result = await addFavoriteEventExternal(authToken, event.id);
          return { kind: result.ok ? "migrated" : "failed", slug };
        })
      );

      for (const s of settled) {
        if (s.status !== "fulfilled") {
          failed += 1;
          continue;
        }
        if (s.value.kind === "migrated") migrated += 1;
        else if (s.value.kind === "dropped") dropped += 1;
        else failed += 1;
      }
    }

    // Clear the guest cookie when nothing failed transiently. Permanently
    // dropped (notFound) slugs don't block the clear — they'd never succeed
    // on a retry, so keeping the cookie just causes redundant work every
    // login.
    if (failed === 0) {
      const cookieStore = await cookies();
      cookieStore.delete(FAVORITES_COOKIE_NAME);
    }

    return NextResponse.json(
      { ok: true, migrated, dropped, failed },
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
