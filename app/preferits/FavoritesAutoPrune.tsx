"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function FavoritesAutoPrune({
  slugsToRemove,
}: {
  slugsToRemove: string[];
}) {
  const [, startTransition] = useTransition();
  const didRunRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    if (!slugsToRemove || slugsToRemove.length === 0) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugsToRemove }),
        });

        if (response.ok) {
          router.refresh();
        }
      } catch {
        // Best-effort cleanup: never block rendering.
      }
    });
  }, [router, slugsToRemove]);

  // No UI: this is a background cleanup.
  return null;
}
