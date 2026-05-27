"use client";

import dynamic from "next/dynamic";
import { isE2ETestMode } from "@utils/env";

/**
 * Lazy, client-only mount for the guest favorite login nudge. Kept out of
 * SSR (it only reacts to a client window event) and suppressed under E2E so
 * the bottom toast can't interfere with multi-step Playwright favorite flows.
 */
const FavoriteLoginNudge = isE2ETestMode
  ? null
  : dynamic(() => import("./FavoriteLoginNudge"), { ssr: false });

export default function LazyFavoriteLoginNudge() {
  if (!FavoriteLoginNudge) return null;
  return <FavoriteLoginNudge />;
}
