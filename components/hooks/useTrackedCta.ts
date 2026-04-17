"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TrackedCtaId } from "types/analytics";
import {
  registerCta,
  trackCtaClick,
  unregisterCta,
} from "@utils/ctaTracking";

/**
 * Hooks a DOM element into the session-wide CTA tracker. Returns a stable
 * ref callback to attach to the element being tracked plus a `trackClick`
 * helper the component can call from its existing click handler.
 *
 * Impressions are observed automatically once the element crosses 50%
 * viewport visibility; each element is counted at most once per session.
 */
export default function useTrackedCta<T extends Element = HTMLElement>(
  id: TrackedCtaId
): { ref: (el: T | null) => void; trackClick: () => void } {
  const currentRef = useRef<T | null>(null);

  const ref = useCallback(
    (el: T | null) => {
      if (currentRef.current && currentRef.current !== el) {
        unregisterCta(currentRef.current);
      }
      currentRef.current = el;
      if (el) {
        registerCta(el, id);
      }
    },
    [id]
  );

  // Final cleanup on unmount.
  useEffect(() => {
    return () => {
      if (currentRef.current) {
        unregisterCta(currentRef.current);
        currentRef.current = null;
      }
    };
  }, []);

  const trackClick = useCallback(() => {
    trackCtaClick(id);
  }, [id]);

  return { ref, trackClick };
}
