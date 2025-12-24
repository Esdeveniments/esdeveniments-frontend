"use client";

import { useEffect, useRef, useTransition } from "react";
import { pruneFavoritesAction } from "@app/actions/favorites";

export default function FavoritesAutoPrune({
  slugsToRemove,
}: {
  slugsToRemove: string[];
}) {
  const [, startTransition] = useTransition();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    if (!slugsToRemove || slugsToRemove.length === 0) return;

    startTransition(async () => {
      try {
        await pruneFavoritesAction(slugsToRemove);
      } catch {
        // Best-effort cleanup: never block rendering.
      }
    });
  }, [slugsToRemove]);

  // No UI: this is a background cleanup.
  return null;
}
