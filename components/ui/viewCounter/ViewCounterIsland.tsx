"use client";

import { useRef, RefObject } from "react";
import useOnScreen from "@components/hooks/useOnScreen";
import ViewCounter from "@components/ui/viewCounter";
import { ViewCounterProps } from "types/common";

export default function ViewCounterIsland({
  visits,
  priority,
  hideText = true,
  className,
}: ViewCounterProps & { priority: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isVisible = useOnScreen(ref as RefObject<Element>, {
    freezeOnceVisible: true,
  });

  return (
    <div
      ref={ref}
      className={className || ""}
      data-view-counter
      style={{ minWidth: 80 }}
    >
      {priority ? (
        <ViewCounter visits={visits} hideText={hideText} />
      ) : isVisible ? (
        <ViewCounter visits={visits} hideText={hideText} />
      ) : (
        <div className="flex items-center gap-1 h-8 animate-pulse" aria-hidden="true">
          <div className="w-5 h-5 rounded bg-border/40 dark:bg-border" />
          <div className="w-10 h-4 rounded bg-border/40 dark:bg-border" />
        </div>
      )}
    </div>
  );
}
