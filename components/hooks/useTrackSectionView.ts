"use client";

import { useEffect, useRef, RefObject } from "react";
import useOnScreen from "./useOnScreen";
import { sendGoogleEvent } from "@utils/analytics";

/**
 * Track when a section scrolls into view — fires the GA4 event once.
 * Reuses the existing useOnScreen hook with freezeOnceVisible.
 *
 * @param sectionName - The section identifier (e.g. "description", "location")
 * @param context - Where the section lives (e.g. "event_detail", "listing")
 * @param extraParams - Additional params to attach to the event. Stable reference
 *   recommended (useMemo/useRef) to avoid unnecessary effect re-runs.
 * @param enabled - Only track when true (e.g. wait for data to load)
 */
export default function useTrackSectionView(
  ref: RefObject<Element>,
  sectionName: string,
  context: string,
  extraParams?: Record<string, string | number | boolean | undefined>,
  enabled = true,
): void {
  const isVisible = useOnScreen(ref, { freezeOnceVisible: true });
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current && isVisible && enabled) {
      sendGoogleEvent("section_view", {
        section: sectionName,
        context,
        ...extraParams,
      });
      hasTracked.current = true;
    }
  }, [isVisible, enabled, sectionName, context, extraParams]);
}
