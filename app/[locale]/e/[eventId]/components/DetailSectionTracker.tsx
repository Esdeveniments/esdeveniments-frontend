"use client";

import { useRef } from "react";
import useTrackSectionView from "@components/hooks/useTrackSectionView";
import type { DetailSectionTrackerProps } from "types/props";

/**
 * Wraps a detail page section and fires a `section_view` GA4 event
 * once the section scrolls into the viewport. Renders as a plain <div>.
 */
export default function DetailSectionTracker({
  section,
  context = "event_detail",
  children,
  className,
}: DetailSectionTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTrackSectionView(ref as unknown as React.RefObject<Element>, section, context);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
