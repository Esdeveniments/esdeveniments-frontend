"use client";

import { useRef, type ReactNode } from "react";
import useTrackSectionView from "@components/hooks/useTrackSectionView";

/**
 * Wraps a detail page section and fires a `section_view` GA4 event
 * once the section scrolls into the viewport. Renders as a plain <div>.
 */
export default function DetailSectionTracker({
  section,
  context = "event_detail",
  children,
  className,
}: {
  section: string;
  context?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTrackSectionView(ref as React.RefObject<Element>, section, context);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
