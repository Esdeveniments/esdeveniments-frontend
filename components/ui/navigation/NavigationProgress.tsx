"use client";

import { useNavigationProgressStore } from "@components/hooks/useNavigationProgress";
import { useHydration } from "@components/hooks/useHydration";
import { useGlobalNavigation } from "@components/hooks/useGlobalNavigation";

export function NavigationProgress() {
  const isHydrated = useHydration();
  const isNavigating = useNavigationProgressStore((s) => s.isNavigating);
  
  // Set up global navigation listener (intercepts all Link clicks)
  useGlobalNavigation();

  // Don't render on server or before hydration, or if not navigating
  // Early return to avoid unnecessary DOM work
  if (!isHydrated || !isNavigating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/20" aria-hidden="true">
      <div className="h-full w-1/3 bg-primary animate-[progress_1s_ease-in-out_infinite]" />
    </div>
  );
}
