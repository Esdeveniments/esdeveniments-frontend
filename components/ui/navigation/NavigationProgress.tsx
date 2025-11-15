"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNavigationProgressStore } from "@components/hooks/useNavigationProgress";
import { useHydration } from "@components/hooks/useHydration";

export function NavigationProgress() {
  const isHydrated = useHydration();
  const isNavigating = useNavigationProgressStore((s) => s.isNavigating);
  const done = useNavigationProgressStore((s) => s.done);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // Reset progress when pathname changes (navigation completes)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      done();
    }
  }, [pathname, done]);

  // Don't render on server or before hydration, or if not navigating
  // Early return to avoid unnecessary DOM work
  if (!isHydrated || !isNavigating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/20" aria-hidden="true">
      <div className="h-full w-1/3 bg-primary animate-[progress_1s_ease-in-out_infinite]" />
    </div>
  );
}
