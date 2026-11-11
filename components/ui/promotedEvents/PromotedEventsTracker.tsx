"use client";

import { useMemo, useRef } from "react";
import useTrackSectionView from "@components/hooks/useTrackSectionView";
import type { PromotedEventsTrackerProps } from "types/props";

/** Sends one `section_view` (section `promoted_events`) when the row is seen. */
export default function PromotedEventsTracker({
  context,
  placeSlug,
  eventCount,
  children,
}: PromotedEventsTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const params = useMemo(
    () => ({ place_slug: placeSlug, event_count: eventCount }),
    [placeSlug, eventCount],
  );
  useTrackSectionView(
    ref as unknown as React.RefObject<Element>,
    "promoted_events",
    context,
    params,
  );

  return (
    <div
      ref={ref}
      data-analytics-container="true"
      data-analytics-context={context}
      data-analytics-place-slug={placeSlug}
    >
      {children}
    </div>
  );
}
