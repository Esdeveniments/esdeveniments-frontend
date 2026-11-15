"use client";

import { useEffect } from "react";
import { useRouter } from "@i18n/routing";
import { takeFavoritesChanged } from "@utils/favorites-events";

// Runs each time /preferits is shown, also when Next restores it from its
// client cache, and refetches it if a favorite changed on another page.
export default function FavoritesRefreshOnShow() {
  const router = useRouter();

  useEffect(() => {
    if (takeFavoritesChanged()) router.refresh();
  }, [router]);

  return null;
}
