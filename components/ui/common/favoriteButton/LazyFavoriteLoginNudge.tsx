"use client";

import dynamic from "next/dynamic";

/**
 * Lazy, client-only mount for the guest favorite login nudge. Kept out of
 * SSR because the component only reacts to a client `window` event. Unlike
 * SocialFollowPopup (full-screen modal that genuinely blocks Playwright
 * clicks), the nudge's wrapper is `pointer-events-none` and only the inner
 * toast pill captures clicks, so it doesn't need an E2E-mode suppression —
 * suppressing it on Vercel previews that happen to expose
 * NEXT_PUBLIC_E2E_TEST_MODE was the reason the guest toast never appeared.
 */
const FavoriteLoginNudge = dynamic(() => import("./FavoriteLoginNudge"), {
  ssr: false,
});

export default function LazyFavoriteLoginNudge() {
  return <FavoriteLoginNudge />;
}
