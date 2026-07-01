"use client";

import FavoriteLoginNudge from "./FavoriteLoginNudge";

/**
 * Mount point for the guest favorite login nudge. Imported eagerly (not
 * `next/dynamic({ ssr: false })`) because the component listens for a
 * `favorites:guest-saved` window event — a lazy chunk could finish loading
 * AFTER the user's first click, dropping the event before the listener
 * attaches and the toast would never appear.
 *
 * The component itself is a "use client" leaf that renders nothing until
 * the event fires (and short-circuits for authenticated users), so the SSR
 * cost is negligible.
 */
export default function LazyFavoriteLoginNudge() {
  return <FavoriteLoginNudge />;
}
