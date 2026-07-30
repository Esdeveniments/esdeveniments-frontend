"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";

export default function FavoritesAutoPrune({
  slugsToRemove,
  eventIdsToRemove = [],
}: {
  slugsToRemove: string[];
  eventIdsToRemove?: string[];
}) {
  const [, startTransition] = useTransition();
  const didRunRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    const hasSlugs = slugsToRemove && slugsToRemove.length > 0;
    const hasEventIds = eventIdsToRemove && eventIdsToRemove.length > 0;
    if (!hasSlugs && !hasEventIds) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/favorites/prune", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugsToRemove, eventIdsToRemove }),
        });

        if (response.ok) {
          router.refresh();
        }
      } catch (error: unknown) {
        // Best-effort cleanup: never block rendering, but report for debugging.
        captureException(error, {
          tags: { feature: "favorites", action: "auto-prune" },
          extra: {
            slugs_to_remove_count: slugsToRemove.length,
            slugs_to_remove_sample: slugsToRemove.slice(0, 20),
            event_ids_to_remove_count: eventIdsToRemove.length,
            event_ids_to_remove_sample: eventIdsToRemove.slice(0, 20),
          },
        });

        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to auto-prune favorites:", error);
        }
      }
    });
  }, [router, slugsToRemove, eventIdsToRemove]);

  // No UI: this is a background cleanup.
  return null;
}
